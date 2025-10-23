    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"role": "recruiter"}'
    WHERE email = 'sammingas2002@gmail.com';