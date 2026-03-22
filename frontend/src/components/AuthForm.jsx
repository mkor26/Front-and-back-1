import React, { useState } from 'react';

export default function AuthForm({ onLogin, onRegister, error: externalError }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                await onLogin(email, password);
            } else {
                await onRegister(email, firstName, lastName, password);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-modal">
            <div className="auth-card">
                <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
                {error && <div className="auth-error">{error}</div>}
                {externalError && <div className="auth-error">{externalError}</div>}
                
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />
                    
                    {!isLogin && (
                        <>
                            <input
                                type="text"
                                placeholder="Имя"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <input
                                type="text"
                                placeholder="Фамилия"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </>
                    )}
                    
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                    
                    <button type="submit" disabled={loading}>
                        {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                </form>
                
                <button 
                    className="auth-switch" 
                    onClick={() => setIsLogin(!isLogin)}
                    disabled={loading}
                >
                    {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                </button>
            </div>
        </div>
    );
}