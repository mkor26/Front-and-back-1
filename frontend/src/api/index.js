import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// ========== ПЕРЕХВАТЧИК ЗАПРОСОВ ==========
// Автоматически добавляем access-токен к каждому запросу
apiClient.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ========== ПЕРЕХВАТЧИК ОТВЕТОВ ==========
// Автоматически обновляем токены при ошибке 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Если ошибка 401 и это не повторный запрос
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
                // Нет refresh-токена — выходим
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.dispatchEvent(new Event('auth-error'));
                return Promise.reject(error);
            }
            
            try {
                // Пытаемся обновить токены
                const response = await axios.post('http://localhost:3000/api/auth/refresh', {
                    refreshToken
                });
                
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                
                // Сохраняем новые токены
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                
                // Повторяем исходный запрос с новым токеном
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
                
            } catch (refreshError) {
                // Обновление не удалось — очищаем токены
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.dispatchEvent(new Event('auth-error'));
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

// ========== API МЕТОДЫ ==========
export const api = {
    // Аутентификация
    register: async (userData) => {
        const response = await apiClient.post('/auth/register', userData);
        return response.data;
    },
    
    login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        // Сохраняем токены при успешном входе
        if (response.data.accessToken && response.data.refreshToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        return response.data;
    },
    
    getCurrentUser: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
    
    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },
    
    // Товары
    getProducts: async () => {
        const response = await apiClient.get('/products');
        return response.data;
    },
    
    getProductById: async (id) => {
        const response = await apiClient.get(`/products/${id}`);
        return response.data;
    },
    
    createProduct: async (product) => {
        const response = await apiClient.post('/products', product);
        return response.data;
    },
    
    updateProduct: async (id, product) => {
        const response = await apiClient.put(`/products/${id}`, product);
        return response.data;
    },
    
    deleteProduct: async (id) => {
        const response = await apiClient.delete(`/products/${id}`);
        return response.data;
    }
};