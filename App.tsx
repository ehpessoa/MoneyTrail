

import React, { useState, useMemo } from 'react';
import { Home, PieChart, Target, User, Users, ClipboardCopy, LogOut, Check, GanttChartSquare } from 'lucide-react';
import { AppProvider, useApp } from './contexts/AppContext';
import Auth from './components/Auth';
import DashboardScreen from './screens/DashboardScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import GoalsScreen from './screens/GoalsScreen';
import BudgetScreen from './screens/BudgetScreen';
import Spinner from './components/ui/Spinner';
import FamilyModal from './components/modals/FamilyModal';

type Screen = 'transactions' | 'dashboard' | 'goals' | 'budget';

const Header: React.FC = () => {
    const { userProfile, logout } = useApp();
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm p-4 flex justify-between items-center z-40 border-b border-gray-700">
                <div className="flex flex-col">
                    <span className="text-sm text-gray-400">Bem-vindo(a),</span>
                    <h1 className="text-lg font-bold text-white">{userProfile?.name || 'Usuário'}</h1>
                </div>
                <div className="flex items-center space-x-3">
                     <button onClick={() => setIsFamilyModalOpen(true)} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                        <Users className="w-5 h-5 text-cyan-400" />
                    </button>
                    <button onClick={logout} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                        <LogOut className="w-5 h-5 text-red-400" />
                    </button>
                </div>
            </header>
            <FamilyModal isOpen={isFamilyModalOpen} onClose={() => setIsFamilyModalOpen(false)} />
        </>
    );
};


const BottomNav: React.FC<{ activeScreen: Screen; setActiveScreen: (screen: Screen) => void }> = ({ activeScreen, setActiveScreen }) => {
    const navItems = [
        { id: 'transactions', label: 'Lançamentos', icon: Home },
        { id: 'dashboard', label: 'Resumo', icon: PieChart },
        { id: 'budget', label: 'Orçamento', icon: GanttChartSquare },
        { id: 'goals', label: 'Metas', icon: Target },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 py-1 px-2 z-40">
            <div className="flex justify-around items-center max-w-md mx-auto">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveScreen(item.id as Screen)}
                        className={`flex flex-col items-center justify-center w-20 h-12 rounded-lg transition-all duration-300 ${activeScreen === item.id ? 'bg-cyan-500 text-white scale-110' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <item.icon className="w-5 h-5 mb-1" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};


const MainApp: React.FC = () => {
    const [activeScreen, setActiveScreen] = useState<Screen>('transactions');
    const { loadingData } = useApp();

    const ScreenComponent = useMemo(() => {
        switch (activeScreen) {
            case 'transactions': return TransactionsScreen;
            case 'dashboard': return DashboardScreen;
            case 'budget': return BudgetScreen;
            case 'goals': return GoalsScreen;
            default: return TransactionsScreen;
        }
    }, [activeScreen]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <Header />
            <main className="pt-24 pb-24 px-4">
                {loadingData ? <div className="flex justify-center items-center h-64"><Spinner /></div> : <ScreenComponent />}
            </main>
            <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
        </div>
    );
};

const AppContent: React.FC = () => {
    const { user, loadingAuth } = useApp();
    
    if (loadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <Spinner />
            </div>
        );
    }

    return user ? <MainApp /> : <Auth />;
}

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};

export default App;