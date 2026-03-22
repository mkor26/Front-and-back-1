import React, { useState, useEffect } from 'react';
import ProductsPage from './pages/ProductsPage/ProductsPage';
import AuthForm from './components/AuthForm';
import { api } from './api';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        // Проверяем, есть ли сохраненный токен
        const token = localStorage.getItem('accessToken');
        
        if (token) {
            // Пытаемся получить данные пользователя
            checkAuth();
        } else {
            setLoading(false);
        }
        
        // Слушаем событие ошибки аутентификации
        const handleAuthError = () => {
            setAuthError('Сессия истекла. Пожалуйста, войдите снова.');
            setIsAuthenticated(false);
            setUser(null);
        };
        
        window.addEventListener('auth-error', handleAuthError);
        return () => window.removeEventListener('auth-error', handleAuthError);
    }, []);

    const checkAuth = async () => {
        try {
            const userData = await api.getCurrentUser();
            setUser(userData);
            setIsAuthenticated(true);
            setAuthError('');
        } catch (err) {
            // Токен недействителен
            api.logout();
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (email, password) => {
        const response = await api.login(email, password);
        // После входа получаем данные пользователя
        const userData = await api.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
        setAuthError('');
    };

    const handleRegister = async (email, firstName, lastName, password) => {
        await api.register({ email, first_name: firstName, last_name: lastName, password });
        // После регистрации автоматически входим
        await handleLogin(email, password);
    };

    const handleLogout = () => {
        api.logout();
        setIsAuthenticated(false);
        setUser(null);
        setAuthError('');
    };

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    if (!isAuthenticated) {
        return <AuthForm onLogin={handleLogin} onRegister={handleRegister} error={authError} />;
    }

    return (
        <div className="App">
            <div className="app-header">
                <div className="user-info">
                    Добро пожаловать, {user?.first_name} {user?.last_name}
                    <span className="user-email">({user?.email})</span>
                </div>
                <button onClick={handleLogout} className="logout-btn">Выйти</button>
            </div>
            <ProductsPage />
        </div>
    );
}

export default App;