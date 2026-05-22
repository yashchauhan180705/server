const User = require('../models/User');

// @desc    Create employee user (Admin only)
// @route   POST /api/admin/employees
const createEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const employee = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'employee',
      createdBy: req.user._id,
      isEmailVerified: true,
    });

    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      createdAt: employee.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all employees (Admin only)
// @route   GET /api/admin/employees
const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee (Admin only)
// @route   PUT /api/admin/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);

    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const { name, email, password } = req.body;

    if (name) employee.name = name;
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: employee._id } });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      employee.email = email.toLowerCase();
    }
    if (password) employee.password = password;

    await employee.save();

    res.json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete employee (Admin only)
// @route   DELETE /api/admin/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);

    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await employee.deleteOne();
    res.json({ message: 'Employee removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createEmployee, getAllEmployees, updateEmployee, deleteEmployee };
