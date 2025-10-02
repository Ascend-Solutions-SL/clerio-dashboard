-- Create auth_users table
CREATE TABLE IF NOT EXISTS public.auth_users (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_lastname TEXT NOT NULL,
  user_initials TEXT NOT NULL,
  user_businessname TEXT NOT NULL,
  CONSTRAINT auth_users_user_uid_key UNIQUE (user_uid)
);

-- Enable RLS
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;

-- Create policies for auth_users
CREATE POLICY "Users can view their own data" 
  ON public.auth_users 
  FOR SELECT 
  USING (auth.uid() = user_uid);

CREATE POLICY "Users can insert their own data" 
  ON public.auth_users 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_uid);

CREATE POLICY "Users can update their own data" 
  ON public.auth_users 
  FOR UPDATE 
  USING (auth.uid() = user_uid);

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auth_users (
    user_uid,
    user_email,
    user_name,
    user_lastname,
    user_initials,
    user_businessname
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'email',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'user_initials',
    NEW.raw_user_meta_data->>'user_businessname'
  ) ON CONFLICT (user_uid) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to handle new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();