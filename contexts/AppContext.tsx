
import React, { createContext, useContext, ReactNode, FC } from 'react';
import { useAuth, AuthHook } from '../hooks/useAuth';
import { useFinanceData, FinanceDataHook } from '../hooks/useFinanceData';

type AppContextType = AuthHook & FinanceDataHook;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const auth = useAuth();
    const financeData = useFinanceData(auth.user?.uid, auth.userProfile?.familyId);

    const value = { ...auth, ...financeData };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
