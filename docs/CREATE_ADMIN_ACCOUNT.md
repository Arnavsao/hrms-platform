# How to Create Admin Account

## 📝 Step-by-Step Instructions

### Option 1: Using the Sign Up Page (Easiest)

1. **Visit the Sign Up Page:**
   ```
   http://localhost:3000/signup
   ```

2. **Fill in the Details:**
   - Email: `arnavsao1924@gmail.com`
   - Password: `123456` (minimum 6 characters required)
   - Role: Select **"Admin"** from the dropdown

3. **Click "Sign Up"**

4. **You're Done!**
   - You'll be automatically redirected to http://localhost:3000/admin
   - Now you can login anytime with these credentials

---

### Option 2: Using the Login Page

If you already created an account but want to login:

1. **Visit the Login Page:**
   ```
   http://localhost:3000/login
   ```

2. **Enter Credentials:**
   - Email: `arnavsao1924@gmail.com`
   - Password: `123456`

3. **Click "Login"**

4. **Auto-redirect:**
   - You'll be redirected to your role-specific dashboard
   - Admin → http://localhost:3000/admin
   - Recruiter → http://localhost:3000/recruiter
   - Candidate → http://localhost:3000/candidate

---

## 🎯 Quick Access

After creating/logging in as admin:

### Admin Dashboard
**URL:** http://localhost:3000/admin

**What you can access:**
- ✅ Full system access
- ✅ User management (when implemented)
- ✅ System-wide statistics
- ✅ All recruiter features
- ✅ All candidate features

---

## 🧪 Test Other Roles Too

### Create Recruiter Account
```
Email: recruiter@test.com
Password: 123456
Role: Recruiter
```

### Create Candidate Account
```
Email: candidate@test.com
Password: 123456
Role: Candidate
```

---

## 🔧 Troubleshooting

### "Password must be at least 6 characters"
Solution: Use at least 6 characters. Change `123456` to `123456` or longer.

### "User already exists"
Solution: The email is already registered. Either:
1. Use a different email
2. Login with existing credentials
3. Check Supabase dashboard to delete the user

### Can't Select Role
Solution: Make sure you're on the **Sign Up** page (not Login). The role selector only appears during signup.

### Signup Success but Redirect Not Working
Solution:
1. Check browser console for errors
2. Make sure frontend is running on port 3000
3. Check if backend is running on port 8000

---

## 📱 Direct Links

- **Sign Up:** http://localhost:3000/signup
- **Login:** http://localhost:3000/login
- **Admin Dashboard:** http://localhost:3000/admin
- **Recruiter Dashboard:** http://localhost:3000/recruiter
- **Candidate Dashboard:** http://localhost:3000/candidate

---

## ✅ What Changed

I've enhanced the signup form to include a **role selector dropdown**:
- ✅ Candidate (default)
- ✅ Recruiter
- ✅ Admin

Now you can choose your role during signup!

---

## 🎉 Ready to Use!

Just visit http://localhost:3000/signup and create your admin account!

