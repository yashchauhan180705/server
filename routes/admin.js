const express = require('express');
const router = express.Router();
const { protect, adminOrEmployee, adminOnly } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { uploadImage, uploadPDF } = require('../middleware/multerConfig');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { createArticle, updateArticle, deleteArticle, publishArticle, unpublishArticle, getAdminArticles } = require('../controllers/articleController');
const { createEPaper, updateEPaper, deleteEPaper } = require('../controllers/epaperController');
const { getStats } = require('../controllers/adminController');
const {
  getAllComments,
  updateComment,
  deleteComment,
  unflagComment,
} = require('../controllers/commentController');
const {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const {
  getAllUsers,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
} = require('../controllers/userManagementController');
const {
  getAdminCharchaPatra,
  approveCharchaPatra,
  rejectCharchaPatra,
  deleteCharchaPatra,
} = require('../controllers/charchapatraController');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin panel endpoints (requires JWT + Admin/Employee role)
 */

// All admin routes require authentication + admin or employee role
router.use(protect);
router.use(adminOrEmployee);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalArticles:
 *                   type: integer
 *                 publishedArticles:
 *                   type: integer
 *                 draftArticles:
 *                   type: integer
 *                 totalUsers:
 *                   type: integer
 *                 premiumArticles:
 *                   type: integer
 *                 subscribedUsers:
 *                   type: integer
 *                 employeeCount:
 *                   type: integer
 *                 bannedUsers:
 *                   type: integer
 *                 activeSubscriptions:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin/employee only)
 */
router.get('/stats', getStats);

/**
 * @swagger
 * /api/admin/articles:
 *   get:
 *     summary: Get all articles (including drafts, paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, draft, published]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of all articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedArticles'
 *   post:
 *     summary: Create a new article
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, content, category]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               isPremium:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *     responses:
 *       201:
 *         description: Article created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 */
router.get('/articles', getAdminArticles);
router.post('/articles', uploadLimiter, uploadImage.single('image'), createArticle);

/**
 * @swagger
 * /api/admin/articles/{id}:
 *   put:
 *     summary: Update an article
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               isPremium:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *     responses:
 *       200:
 *         description: Article updated
 *       404:
 *         description: Article not found
 *   delete:
 *     summary: Delete an article (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article removed
 *       404:
 *         description: Article not found
 */
router.put('/articles/:id', uploadLimiter, uploadImage.single('image'), updateArticle);
router.delete('/articles/:id', adminOnly, deleteArticle);

/**
 * @swagger
 * /api/admin/articles/{id}/publish:
 *   put:
 *     summary: Publish a draft article (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article published
 *       404:
 *         description: Article not found
 */
router.put('/articles/:id/publish', adminOnly, publishArticle);

/**
 * @swagger
 * /api/admin/articles/{id}/unpublish:
 *   put:
 *     summary: Unpublish an article (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article unpublished
 *       404:
 *         description: Article not found
 */
router.put('/articles/:id/unpublish', adminOnly, unpublishArticle);

/**
 * @swagger
 * /api/admin/epapers:
 *   post:
 *     summary: Create a new e-paper edition
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, publishDate]
 *             properties:
 *               title:
 *                 type: string
 *               publishDate:
 *                 type: string
 *                 format: date
 *               pdfUrl:
 *                 type: string
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: E-Paper created
 */
router.post('/epapers', uploadLimiter, uploadPDF.single('pdf'), createEPaper);

/**
 * @swagger
 * /api/admin/epapers/{id}:
 *   put:
 *     summary: Update an e-paper edition
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               publishDate:
 *                 type: string
 *                 format: date
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: E-Paper updated
 *       404:
 *         description: E-Paper not found
 *   delete:
 *     summary: Delete an e-paper edition (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-Paper removed
 *       404:
 *         description: E-Paper not found
 */
router.put('/epapers/:id', uploadLimiter, uploadPDF.single('pdf'), updateEPaper);
router.delete('/epapers/:id', adminOnly, deleteEPaper);

/**
 * @swagger
 * /api/admin/comments:
 *   get:
 *     summary: Get all comments (for moderation)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all comments
 */
router.get('/comments', getAllComments);

/**
 * @swagger
 * /api/admin/comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment updated
 *   delete:
 *     summary: Delete a comment (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 */
router.put('/comments/:id', updateComment);
router.delete('/comments/:id', adminOnly, deleteComment);

/**
 * @swagger
 * /api/admin/comments/{id}/unflag:
 *   put:
 *     summary: Unflag a reported comment
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment unflagged
 */
router.put('/comments/:id/unflag', unflagComment);

// ─── Charcha Patra Submissions ───────────────────────────────────
router.get('/charchapatra', getAdminCharchaPatra);
router.put('/charchapatra/:id/approve', approveCharchaPatra);
router.put('/charchapatra/:id/reject', rejectCharchaPatra);
router.delete('/charchapatra/:id', adminOnly, deleteCharchaPatra);

/**
 * @swagger
 * /api/admin/employees:
 *   get:
 *     summary: Get all employees (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *   post:
 *     summary: Create a new employee (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee created
 */
router.get('/employees', adminOnly, getAllEmployees);
router.post('/employees', adminOnly, createEmployee);

/**
 * @swagger
 * /api/admin/employees/{id}:
 *   put:
 *     summary: Update an employee (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee updated
 *   delete:
 *     summary: Delete an employee (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee deleted
 */
router.put('/employees/:id', adminOnly, updateEmployee);
router.delete('/employees/:id', adminOnly, deleteEmployee);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/users', adminOnly, getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, employee, user]
 *     responses:
 *       200:
 *         description: User role updated
 */
router.put('/users/:id/role', adminOnly, updateUserRole);

/**
 * @swagger
 * /api/admin/users/{id}/ban:
 *   put:
 *     summary: Ban a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User banned
 */
router.put('/users/:id/ban', adminOnly, banUser);

/**
 * @swagger
 * /api/admin/users/{id}/unban:
 *   put:
 *     summary: Unban a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unbanned
 */
router.put('/users/:id/unban', adminOnly, unbanUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/users/:id', adminOnly, deleteUser);

module.exports = router;
