import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, LoaderCircle } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { initializeSupabase, getSupabase } from './services/supabase';
import { VIEWS, THEMES, themeClasses } from './constants';
import { FinancialEntry, View, Theme } from './types';
import { useFinancialMetrics } from './hooks/useFinancialMetrics';
import Navigation from './components/Navigation';
import DashboardView from './components/DashboardView';
import StocksView from './components/StocksView';
import MutualFundsView from './components/MutualFundsView';
import AddEntryModal from './components/AddEntryModal';
import SupabaseCredentialsModal from './components/SupabaseCredentialsModal';
import Login from './components/Login';

type SupabaseStatus = 'idle' | 'connecting' | 'connected' | 'error';
interface UserSession {
    username: string;
    id: string;
}

const App = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // App State
    const [activeView, setActiveView] = useState<View>(VIEWS.DASHBOARD);
    const [selectedRegion, setSelectedRegion] = useState('India');
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
    const [theme, setTheme] = useState<Theme>(THEMES.DARK);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>('idle');
    
    const [supabaseCreds, setSupabaseCreds] = useState<{ url: string; key: string } | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const classes = themeClasses[theme];

    // Check for existing session on initial load
    useEffect(() => {
        try {
            const userSessionJSON = sessionStorage.getItem('zenfolio_user_session');
            if (userSessionJSON) {
                const userSession: UserSession = JSON.parse(userSessionJSON);
                setCurrentUser(userSession);
                setUserId(userSession.id);
                setIsAuthenticated(true);
            }
        } catch (e) {
            console.error("Could not access session storage or parse user session:", e);
        } finally {
            setAuthLoading(false);
        }
    }, []);

    useEffect(() => {
        const storedUrl = localStorage.getItem('supabase_url');
        const storedKey = localStorage.getItem('supabase_key');
        if (storedUrl && storedKey) {
            setSupabaseCreds({ url: storedUrl, key: storedKey });
        } else {
            setIsLoading(false);
        }
    }, []);

    const handleConnect = async (url: string, key: string) => {
        setConnectionError(null);
        setIsLoading(true);
        try {
            const supabase = initializeSupabase(url, key);
            const { error } = await supabase.from('financial_entries').select('*', { count: 'exact', head: true });
            if (error && (error.message.includes('Invalid API key') || error.message.includes('invalid JWT'))) {
                 throw new Error('Connection failed: Invalid Supabase URL or Anon Key.');
            }
            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_key', key);
            setSupabaseCreds({ url, key });
        } catch (error: any) {
            setConnectionError(error.message || 'Failed to connect. Please check credentials and try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const fetchEntries = async (currentUserId: string) => {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('financial_entries')
                .select('*')
                .eq('user_id', currentUserId);

            if (error) throw error;
            setEntries(data || []);
            setFetchError(null);
        } catch (error: any) {
            console.error("Error fetching data:", error);
            const detailedErrorMessage = error.message || String(error) || 'An unknown error occurred.';
            setFetchError(detailedErrorMessage);
            setEntries([]);
            throw error;
        }
    };
    
    useEffect(() => {
        let channel: RealtimeChannel | null = null;

        const connectAndFetch = async () => {
            if (!userId || !supabaseCreds) {
                if (!supabaseCreds) setIsLoading(false);
                return;
            };
            
            setIsLoading(true);
            setSupabaseStatus('connecting');
            setFetchError(null);

            try {
                initializeSupabase(supabaseCreds.url, supabaseCreds.key);
                await fetchEntries(userId);
                setSupabaseStatus('connected');

                channel = getSupabase()
                    .channel('financial_entries')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, (payload) => {
                        console.log('Change received!', payload)
                        if (userId) fetchEntries(userId);
                    })
                    .subscribe();

            } catch (error) {
                setSupabaseStatus('error');
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated && userId) {
            connectAndFetch();
        } else {
            setIsLoading(false);
        }
        
        return () => {
            if (channel) {
                getSupabase()?.removeChannel(channel);
                channel = null;
            }
        };
    }, [userId, supabaseCreds, isAuthenticated]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => e.region === selectedRegion);
    }, [entries, selectedRegion]);

    const stocks = useMemo(() => filteredEntries.filter(e => e.type === 'stock'), [filteredEntries]);
    const mutualFunds = useMemo(() => filteredEntries.filter(e => e.type === 'mf'), [filteredEntries]);
    const metrics = useFinancialMetrics(filteredEntries);

    const uniqueStockNames = useMemo(() => [...new Set(entries.filter(e => e.type === 'stock').map(e => e.name))], [entries]);
    const uniqueMfNames = useMemo(() => [...new Set(entries.filter(e => e.type === 'mf').map(e => e.name))], [entries]);
    
    const clearCredentialsAndRetry = () => {
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('supabase_key');
        setSupabaseCreds(null);
        setFetchError(null);
        setSupabaseStatus('idle');
        setConnectionError(null);
    };

    const handleEdit = (entry: FinancialEntry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleDelete = async (entryId: string) => {
        if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            try {
                const supabase = getSupabase();
                const { error } = await supabase.from('financial_entries').delete().eq('id', entryId);
                if (error) throw error;
                // The realtime subscription will trigger a re-fetch, no need to manually update state.
            } catch (error: any) {
                console.error("Failed to delete entry:", error);
                alert(`Failed to delete entry: ${error.message}`);
            }
        }
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleSave = () => {
        // Realtime subscription will handle the update.
    };

    const handleLogin = async (username: string, password: string): Promise<void> => {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) {
            throw new Error("Invalid username or password.");
        }
        
        const userSession = { username: data.username, id: data.id };
        sessionStorage.setItem('zenfolio_user_session', JSON.stringify(userSession));
        setCurrentUser(userSession);
        setUserId(data.id);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('zenfolio_user_session');
        setCurrentUser(null);
        setUserId(null);
        setIsAuthenticated(false);
        setEntries([]); // Clear data on logout
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                    <div className="text-center">
                        <Clock className="h-12 w-12 mx-auto animate-spin text-indigo-500" />
                        <p className="mt-4 text-lg">Connecting to Database...</p>
                    </div>
                </div>
            );
        }

        if (fetchError) {
            return (
                <div className="p-4 sm:p-8 max-w-4xl mx-auto text-center">
                    <div className={`p-8 rounded-2xl ${classes.card}`}>
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-400 mb-3">Database Connection Error</h2>
                        <p className={`mb-6 font-mono bg-red-500/10 text-red-400 p-3 rounded-md break-all text-sm`}>{fetchError}</p>
                        
                        <div className="text-left space-y-4 text-current/80">
                            <p>This error often indicates a problem with database permissions, likely related to Row Level Security (RLS). Please ensure RLS is either disabled for the `financial_entries` table or that appropriate policies are in place to allow read/write access.</p>
                             <p>You can fix this in your Supabase dashboard under <strong>Authentication &rarr; Policies</strong>, or by running a SQL script to create the policies.</p>
                        </div>
                         <button 
                          onClick={clearCredentialsAndRetry}
                          className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            Change Supabase Credentials
                        </button>
                    </div>
                </div>
            );
        }

        switch (activeView) {
            case VIEWS.DASHBOARD:
                return <DashboardView userId={userId} selectedRegion={selectedRegion} theme={theme} metrics={metrics} supabaseStatus={supabaseStatus} hasEntries={filteredEntries.length > 0} />;
            case VIEWS.STOCKS:
                return <StocksView stocks={stocks} selectedRegion={selectedRegion} theme={theme} onEdit={handleEdit} onDelete={handleDelete} />;
            case VIEWS.MUTUAL_FUNDS:
                return <MutualFundsView mutualFunds={mutualFunds} selectedRegion={selectedRegion} theme={theme} onEdit={handleEdit} onDelete={handleDelete} />;
            default:
                return <DashboardView userId={userId} selectedRegion={selectedRegion} theme={theme} metrics={metrics} supabaseStatus={supabaseStatus} hasEntries={filteredEntries.length > 0} />;
        }
    };

    const renderApp = () => {
        if (authLoading) {
             return (
                <div className="flex justify-center items-center h-screen">
                    <LoaderCircle className="h-12 w-12 animate-spin text-indigo-500" />
                </div>
            );
        }

        if (!supabaseCreds) {
            return <SupabaseCredentialsModal onConnect={handleConnect} error={connectionError} theme={theme} />
        }
        
        if (!isAuthenticated) {
            return <Login onLogin={handleLogin} theme={theme} />;
        }
        
        return (
            <>
                <Navigation
                    activeView={activeView}
                    setActiveView={setActiveView}
                    selectedRegion={selectedRegion}
                    setSelectedRegion={setSelectedRegion}
                    theme={theme}
                    setTheme={setTheme}
                    setIsModalOpen={() => setIsModalOpen(true)}
                    username={currentUser?.username ?? null}
                    onLogout={handleLogout}
                />
                <main>
                    {renderContent()}
                </main>
                <AddEntryModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    userId={userId}
                    selectedRegion={selectedRegion}
                    theme={theme}
                    entryToEdit={editingEntry}
                    onSave={handleSave}
                    uniqueStockNames={uniqueStockNames}
                    uniqueMfNames={uniqueMfNames}
                />
            </>
        )
    }
    
    return (
        <div className={`min-h-screen transition-colors duration-300 ${classes.bg}`}>
            {renderApp()}
        </div>
    );
};

export default App;