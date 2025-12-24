import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import ExtractedTransaction from shared types file.
import { TransactionType, CategoryItem, TransactionEntry, ExtractedTransaction } from '../types';
import { format } from 'date-fns';

// IMPORTANT: This service assumes the API_KEY is set in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

interface ParsedTransaction {
    amount: number;
    description: string;
    type: TransactionType;
    categoryId: string;
    date?: string; // YYYY-MM-DD
}

interface ScannedItem {
    name: string;
    price: number;
}

export interface ScannedReceipt {
    total: number;
    date: string; // YYYY-MM-DD
    merchant: string;
    categorySuggestion: string;
    items: ScannedItem[];
    tax: number;
}

const parseTransactionSchema = {
    type: Type.OBJECT,
    properties: {
        amount: { type: Type.NUMBER, description: "Valor numérico da transação." },
        description: { type: Type.STRING, description: "Breve descrição da transação." },
        type: { type: Type.STRING, enum: ["receita", "despesa"], description: "Tipo da transação." },
        categoryId: { type: Type.STRING, description: "O ID da categoria mais apropriada para a transação, escolhido da lista fornecida." },
        date: { type: Type.STRING, description: "Data da transação no formato AAAA-MM-DD. Se nenhuma data for mencionada na anotação, omita este campo." }
    },
    required: ["amount", "description", "type", "categoryId"],
};

const scanReceiptSchema = {
    type: Type.OBJECT,
    properties: {
        total: { type: Type.NUMBER, description: "Valor total do recibo." },
        date: { type: Type.STRING, description: "Data da transação no formato AAAA-MM-DD." },
        merchant: { type: Type.STRING, description: "Nome do estabelecimento comercial." },
        categorySuggestion: { type: Type.STRING, description: "Sugestão de categoria para a despesa." },
        items: {
            type: Type.ARRAY,
            description: "Lista de itens individuais comprados, com nome e preço.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nome do item." },
                    price: { type: Type.NUMBER, description: "Preço do item." }
                },
                required: ["name", "price"]
            }
        },
        tax: { type: Type.NUMBER, description: "Valor total dos impostos, se discriminado. Se não houver, deve ser 0." }
    },
    required: ["total", "date", "merchant", "categorySuggestion", "items"],
};


export const parseNaturalLanguageTransaction = async (
    text: string,
    availableCategories: { id: string; name: string; type: TransactionType }[]
): Promise<ParsedTransaction> => {
    const incomeCategories = availableCategories.filter(c => c.type === 'receita');
    const expenseCategories = availableCategories.filter(c => c.type === 'despesa');

    const prompt = `Sua tarefa é analisar uma anotação financeira e extrair informações estruturadas, incluindo a categoria CORRETA de uma lista.

    Analise a anotação: "${text}"

    A data de hoje é ${format(new Date(), 'yyyy-MM-dd')}. Use-a como referência para termos como "hoje", "ontem", "amanhã".

    Listas de categorias disponíveis:
    - Receitas: ${incomeCategories.map(c => `'${c.name}' (ID: ${c.id})`).join(', ') || 'Nenhuma'}
    - Despesas: ${expenseCategories.map(c => `'${c.name}' (ID: ${c.id})`).join(', ') || 'Nenhuma'}

    Siga estas regras estritamente:

    1.  **Determinar o Tipo (receita ou despesa):**
        *   **Receita:** Use 'receita' se a anotação indicar entrada de dinheiro.
        *   **Despesa:** Use 'despesa' para saídas de dinheiro. O padrão é 'despesa'.

    2.  **Escolher a Categoria:**
        *   Com base na descrição e no TIPO que você determinou, escolha a categoria MAIS APROPRIADA da lista correspondente (Receitas ou Despesas).
        *   **IMPORTANTE:** Você DEVE retornar o ID da categoria escolhida. Se nenhuma for adequada, escolha a mais genérica possível do tipo correto.

    3.  **Extrair Valor, Descrição e Data:**
        *   Extraia o valor numérico da anotação.
        *   Crie uma descrição curta e clara para a transação.
        *   **Extraia a data.** Se a anotação mencionar uma data (ex: "ontem", "dia 25", "25/07"), converta-a para o formato AAAA-MM-DD.
        *   **Se NENHUMA data for mencionada, omita completamente o campo 'date' do objeto JSON.**

    Retorne APENAS o objeto JSON formatado conforme o schema, garantindo que o 'categoryId' seja um dos IDs fornecidos.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: parseTransactionSchema,
        },
    });

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);

    return result as ParsedTransaction;
};


export const scanReceiptWithGemini = async (base64Image: string, mimeType: string): Promise<ScannedReceipt> => {
    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: `Analise a imagem deste recibo ou nota fiscal. Extraia o valor total, a data da compra no formato AAAA-MM-DD, o nome do estabelecimento, uma categoria sugerida para a despesa (em português), e uma lista de todos os itens comprados com seus respectivos preços. Se houver impostos discriminados, extraia o valor total deles, caso contrário, use 0.`,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: scanReceiptSchema,
        },
    });

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);

    return result as ScannedReceipt;
};

export const suggestCategoryForTransaction = async (
    description: string,
    availableCategories: { id: string; name: string }[]
): Promise<string | null> => {
    if (availableCategories.length === 0) return null;

    const categoryMap = availableCategories.reduce((acc, cat) => {
        acc[cat.name] = cat.id;
        return acc;
    }, {} as Record<string, string>);

    const categorySuggestionSchema = {
        type: Type.OBJECT,
        properties: {
            categoryName: {
                type: Type.STRING,
                description: `O nome da categoria escolhida da lista.`,
                enum: Object.keys(categoryMap),
            },
        },
        required: ["categoryName"],
    };

    const prompt = `Sua tarefa é classificar uma transação financeira na categoria mais apropriada.

    A descrição da transação é: "${description}"

    Escolha UMA categoria da seguinte lista que melhor corresponde a esta transação:
    [${Object.keys(categoryMap).join(', ')}]
    
    Retorne APENAS o nome da categoria escolhida, em formato JSON, seguindo o schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: categorySuggestionSchema,
            },
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);

        if (result.categoryName && categoryMap[result.categoryName]) {
            return categoryMap[result.categoryName]; // Return the ID
        }
    } catch (error) {
        console.error("Error suggesting category:", error);
    }

    return null; // Fallback
};

const extractedTransactionSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING, description: "Descrição clara da transação." },
        amount: { type: Type.NUMBER, description: "Valor numérico da transação. Deve ser sempre um número positivo." },
        date: { type: Type.STRING, description: "Data da transação no formato AAAA-MM-DD." },
        categoryId: { type: Type.STRING, description: "O ID da categoria mais apropriada para a transação, escolhido da lista fornecida." },
        type: { type: Type.STRING, enum: ["receita", "despesa"], description: "Tipo da transação (receita para entrada, despesa para saída)." },
    },
    required: ["description", "amount", "date", "categoryId", "type"],
};

const fileExtractionSchema = {
    type: Type.OBJECT,
    properties: {
        transactions: {
            type: Type.ARRAY,
            description: "Lista de todas as transações encontradas no texto.",
            items: extractedTransactionSchema
        }
    },
    required: ["transactions"],
};

export const extractTransactionsFromFile = async (
    fileInput: string | { data: string; mimeType: string },
    availableCategories: { id: string; name: string; type: TransactionType }[]
): Promise<ExtractedTransaction[]> => {
    const incomeCategories = availableCategories.filter(c => c.type === 'receita');
    const expenseCategories = availableCategories.filter(c => c.type === 'despesa');

    const rulesPrompt = `Siga estas regras estritamente para CADA transação que você encontrar:

    1.  **Identificação:** Localize cada linha ou entrada que representa uma transação financeira individual. Ignore linhas de saldo, cabeçalhos ou informações não relacionadas a transações.
    2.  **Extração de Dados:** Para cada transação, extraia:
        *   **Descrição:** Uma descrição clara e concisa (ex: "Pag*uber", "Supermercado XYZ").
        *   **Valor:** O valor numérico da transação. Sempre retorne como um número positivo.
        *   **Data:** A data da transação. Converta-a para o formato AAAA-MM-DD. Se o ano não for especificado, assuma o ano atual.
    3.  **Determinar o Tipo (receita ou despesa):**
        *   Analise o contexto. Palavras como "crédito", "pix recebido", "salário" indicam 'receita'.
        *   Palavras como "débito", "pagamento", "compra", "pix enviado" ou valores negativos indicam 'despesa'.
        *   Se o tipo for ambíguo, use 'despesa' como padrão para compras.
    4.  **Escolher a Categoria:**
        *   Com base na descrição e no TIPO determinado, escolha a categoria MAIS APROPRIADA da lista correspondente (Receitas ou Despesas).
        *   **IMPORTANTE:** Você DEVE retornar o ID da categoria escolhida. Se nenhuma for perfeitamente adequada, escolha a mais genérica possível do tipo correto.
    
    Retorne APENAS um objeto JSON contendo uma lista de todas as transações encontradas, formatado conforme o schema. Se nenhuma transação for encontrada, retorne uma lista vazia.`;

    const categoriesPrompt = `Listas de categorias disponíveis para classificação:
    - Receitas: ${incomeCategories.map(c => `'${c.name}' (ID: ${c.id})`).join(', ') || 'Nenhuma'}
    - Despesas: ${expenseCategories.map(c => `'${c.name}' (ID: ${c.id})`).join(', ') || 'Nenhuma'}`;

    let modelContents;

    if (typeof fileInput === 'string') {
        modelContents = `Sua tarefa é atuar como um assistente financeiro especialista em extrair e categorizar múltiplas transações de um bloco de texto, como um extrato bancário.

        Analise o seguinte texto:
        ---
        ${fileInput}
        ---

        ${categoriesPrompt}
        ${rulesPrompt}`;
    } else {
        const textPart = {
            text: `Sua tarefa é atuar como um assistente financeiro especialista em extrair e categorizar múltiplas transações de um arquivo de extrato bancário (como um PDF), que está em anexo.
            
            Analise o arquivo.
            
            ${categoriesPrompt}
            ${rulesPrompt}`
        };
        const filePart = { inlineData: { data: fileInput.data, mimeType: fileInput.mimeType } };
        modelContents = { parts: [filePart, textPart] };
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: modelContents,
        config: {
            responseMimeType: "application/json",
            responseSchema: fileExtractionSchema,
        },
    });

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);

    return result.transactions as ExtractedTransaction[];
};

const duplicateCheckSchema = {
    type: Type.OBJECT,
    properties: {
        isDuplicate: {
            type: Type.BOOLEAN,
            description: "Verdadeiro se a nova transação for uma duplicata provável de uma existente, senão, falso."
        },
        duplicateId: {
            type: Type.STRING,
            description: "O ID da transação existente que é a duplicata mais provável. Omitir se isDuplicate for falso."
        }
    },
    required: ["isDuplicate"]
};

export const findPotentialDuplicateTransaction = async (
    newTransaction: Omit<TransactionEntry, 'id'>,
    recentTransactions: TransactionEntry[]
): Promise<string | null> => {
    if (recentTransactions.length === 0) {
        return null;
    }

    const prompt = `Sua tarefa é detectar transações duplicadas. Analise a "Nova Transação" e compare-a com a "Lista de Transações Recentes".

    **Nova Transação:**
    - Descrição: "${newTransaction.description}"
    - Valor: ${newTransaction.amount}
    - Data: ${newTransaction.date.substring(0, 10)}
    - Tipo: ${newTransaction.type}

    **Lista de Transações Recentes:**
    ${recentTransactions.map(t => `- ID: ${t.id}, Descrição: "${t.description}", Valor: ${t.amount}, Data: ${t.date.substring(0, 10)}, Tipo: ${t.type}`).join('\n')}

    **Regras para considerar uma duplicata:**
    1.  O **valor** deve ser exatamente o mesmo.
    2.  A **data** deve ser a mesma ou muito próxima (até 2 dias de diferença).
    3.  A **descrição** deve ser muito similar ou idêntica. Pequenas variações como "Uber" e "Pag*uber" devem ser consideradas similares.
    4.  O **tipo** (receita/despesa) deve ser o mesmo.

    Se você encontrar uma duplicata provável que corresponda a TODAS as regras acima, retorne o ID da transação existente. Caso contrário, indique que não é uma duplicata.
    
    Retorne APENAS o objeto JSON formatado.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: duplicateCheckSchema,
            },
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);

        if (result.isDuplicate && result.duplicateId) {
            return result.duplicateId;
        }

    } catch (error) {
        console.error("Error checking for duplicate transaction:", error);
    }
    
    return null;
};
