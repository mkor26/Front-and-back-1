const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ACCESS_SECRET = 'your-access-secret-key-change-in-production';
const REFRESH_SECRET = 'your-refresh-secret-key-change-in-production';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';   
// Роли пользователей
const ROLES = {
    GUEST: 'guest',
    USER: 'user',
    SELLER: 'seller',
    ADMIN: 'admin'
};

// Приоритет ролей (чем выше число, тем больше прав)
const ROLE_PRIORITY = {
    [ROLES.GUEST]: 0,
    [ROLES.USER]: 1,
    [ROLES.SELLER]: 2,
    [ROLES.ADMIN]: 3
};


// Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// Секретный ключ для JWT (в реальном проекте храните в .env)
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Логирование
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            if (req.body.password) {
                console.log('Body:', { ...req.body, password: '***' });
            } else {
                console.log('Body:', req.body);
            }
        }
    });
    next();
});

// --- База данных ---
let users = [];
let products = [
    { id: nanoid(6), userId: null, name: 'Ноутбук ASUS', category: 'Электроника', description: '15.6", 8GB RAM, 512GB SSD', price: 75000 },
    { id: nanoid(6), userId: null, name: 'Мышь Logitech', category: 'Аксессуары', description: 'Беспроводная, 1600 DPI', price: 2500 },
    { id: nanoid(6), userId: null, name: 'Клавиатура Mechanical', category: 'Аксессуары', description: 'Механическая, RGB подсветка', price: 4500 },
    { id: nanoid(6), userId: null, name: 'Монитор Samsung', category: 'Электроника', description: '27", 4K, IPS', price: 32000 },
    { id: nanoid(6), userId: null, name: 'Наушники Sony', category: 'Аудио', description: 'Беспроводные, шумоподавление', price: 15000 },
];
let refreshTokens = new Set();

// --- Вспомогательные функции ---
async function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Middleware для проверки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, ACCESS_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный или истекший токен' });
        }
        req.user = user;
        next();
    });
}

function findUserByEmail(email) {
    return users.find(u => u.email === email);
}

function findUserById(id) {
    return users.find(u => u.id === id);
}

function findProductById(id) {
    return products.find(p => p.id === id);
}

// --- Swagger Configuration ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API интернет-магазина с RBAC',
            version: '1.0.0',
            description: 'API с системой ролей (guest, user, seller, admin)',
        },
        servers: [{ url: `http://localhost:${port}`, description: 'Локальный сервер' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'seller', 'admin'] },
                        isActive: { type: 'boolean' }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        category: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ========== АУТЕНТИФИКАЦИЯ ==========

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Аутентификация пользователей
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               first_name:
 *                 type: string
 *                 example: Иван
 *               last_name:
 *                 type: string
 *                 example: Иванов
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *       400:
 *         description: Ошибка валидации
 *       409:
 *         description: Пользователь уже существует
 */
app.post('/api/auth/register', async (req, res) => {
    const { email, first_name, last_name, password } = req.body;

    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (findUserByEmail(email)) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = {
        id: nanoid(8),
        email: email.toLowerCase().trim(),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role: ROLES.USER,  // 👈 Добавляем роль по умолчанию
        isActive: true,     // 👈 Для блокировки пользователей
        hashedPassword,
    };

    users.push(newUser);

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    refreshTokens.add(refreshToken);

    res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        accessToken,
        refreshToken,
    });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Неверные учетные данные
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = findUserByEmail(email.toLowerCase().trim());
    if (!user) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Генерируем оба токена
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Сохраняем refresh-токен в хранилище
    refreshTokens.add(refreshToken);

    res.json({
        accessToken,
        refreshToken
    });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновить токены по refresh-токену
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: refreshToken не передан
 *       401:
 *         description: Неверный или истекший refresh-токен
 */
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Проверяем, что токен есть в хранилище
    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    try {
        // Проверяем подпись refresh-токена
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        
        // Ищем пользователя
        const user = users.find(u => u.id === payload.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Удаляем старый refresh-токен (ротация)
        refreshTokens.delete(refreshToken);
        
        // Генерируем новую пару токенов
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        
        // Сохраняем новый refresh-токен
        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

/** 
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить информацию о текущем пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *       401:
 *         description: Не авторизован
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (!user.isActive) {
        return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }
    
    res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
    });
});




// ========== ТОВАРЫ (только для авторизованных) ==========

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Управление товарами (только для авторизованных)
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить все товары
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Список товаров
 *       401:
 *         description: Не авторизован
 */
// ========== ТОВАРЫ ==========

// GET /api/products - доступен всем аутентифицированным пользователям
app.get('/api/products', authenticateToken, (req, res) => {
    res.json(products);
});

// GET /api/products/:id - доступен всем аутентифицированным пользователям
app.get('/api/products/:id', authenticateToken, (req, res) => {
    const product = findProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
});

// POST /api/products - только продавец и админ
app.post('/api/products', 
    authenticateToken, 
    roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), 
    (req, res) => {
        const { name, category, description, price } = req.body;

        if (!name || !category || !description || price === undefined) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        const newProduct = {
            id: nanoid(6),
            userId: req.user.id,
            name: name.trim(),
            category: category.trim(),
            description: description.trim(),
            price: Number(price),
        };

        products.push(newProduct);
        res.status(201).json(newProduct);
    }
);

// PUT /api/products/:id - только продавец и админ
app.put('/api/products/:id', 
    authenticateToken, 
    roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), 
    (req, res) => {
        const product = findProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const { name, category, description, price } = req.body;

        if (name !== undefined) product.name = name.trim();
        if (category !== undefined) product.category = category.trim();
        if (description !== undefined) product.description = description.trim();
        if (price !== undefined) product.price = Number(price);

        res.json(product);
    }
);

// DELETE /api/products/:id - только администратор
app.delete('/api/products/:id', 
    authenticateToken, 
    roleMiddleware([ROLES.ADMIN]), 
    (req, res) => {
        const product = findProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        products = products.filter(p => p.id !== req.params.id);
        res.status(204).send();
    }
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Данные товара
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', authenticateToken, (req, res) => {
    const product = findProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, description, price]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post('/api/products', authenticateToken, (req, res) => {
    const { name, category, description, price } = req.body;

    if (!name || !category || !description || price === undefined) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const newProduct = {
        id: nanoid(6),
        userId: req.user.id,
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       403:
 *         description: Нет прав
 *       404:
 *         description: Товар не найден
 */
app.put('/api/products/:id', authenticateToken, (req, res) => {
    const product = findProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    // Проверяем, что пользователь владеет товаром
    if (product.userId && product.userId !== req.user.id) {
        return res.status(403).json({ error: 'Нет прав на редактирование этого товара' });
    }

    const { name, category, description, price } = req.body;

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);

    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Товар удален
 *       403:
 *         description: Нет прав
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', authenticateToken, (req, res) => {
    const product = findProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    // Проверяем, что пользователь владеет товаром
    if (product.userId && product.userId !== req.user.id) {
        return res.status(403).json({ error: 'Нет прав на удаление этого товара' });
    }

    products = products.filter(p => p.id !== req.params.id);
    res.status(204).send();
});

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только админ) ==========

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список всех пользователей
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *       403:
 *         description: Недостаточно прав
 */
app.get('/api/users', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    // Возвращаем всех пользователей (без паролей)
    const safeUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        isActive: u.isActive
    }));
    res.json(safeUsers);
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Данные пользователя
 *       404:
 *         description: Пользователь не найден
 */
app.get('/api/users/:id', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isActive: user.isActive
    });
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить информацию пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 */
app.put('/api/users/:id', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const { first_name, last_name, role } = req.body;
    
    if (first_name !== undefined) user.first_name = first_name.trim();
    if (last_name !== undefined) user.last_name = last_name.trim();
    if (role !== undefined && Object.values(ROLES).includes(role)) {
        user.role = role;
    }
    
    res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isActive: user.isActive
    });
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Пользователь заблокирован
 *       403:
 *         description: Нельзя заблокировать администратора
 */
app.delete('/api/users/:id', authenticateToken, roleMiddleware([ROLES.ADMIN]), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Нельзя заблокировать администратора
    if (user.role === ROLES.ADMIN) {
        return res.status(403).json({ error: 'Нельзя заблокировать администратора' });
    }
    
    user.isActive = false;
    res.json({ message: 'Пользователь заблокирован', user: { id: user.id, email: user.email } });
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});

// Функции генерации токенов
function generateAccessToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role  // 👈 Добавляем роль в токен
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            role: user.role   // 👈 Добавляем роль в refresh-токен
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

// Middleware для проверки ролей
function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Не авторизован' });
        }
        
        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Недостаточно прав. Требуется роль: ' + allowedRoles.join(', ')
            });
        }
        
        next();
    };
}

// Создание администратора при запуске (для тестирования)
async function createAdminIfNotExists() {
    const adminEmail = 'admin@example.com';
    const existingAdmin = users.find(u => u.email === adminEmail);
    
    if (!existingAdmin) {
        const hashedPassword = await hashPassword('admin123');
        const admin = {
            id: nanoid(8),
            email: adminEmail,
            first_name: 'Admin',
            last_name: 'System',
            role: ROLES.ADMIN,
            isActive: true,
            hashedPassword,
        };
        users.push(admin);
        console.log('✅ Администратор создан: admin@example.com / admin123');
    }
}

// После определения users, но перед запуском сервера
createAdminIfNotExists();