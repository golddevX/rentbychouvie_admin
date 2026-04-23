'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const { t } = useI18n();
  const loginSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordTooShort')),
  });
  type LoginFormData = z.infer<typeof loginSchema>;

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const response = await authApi.login(data.email, data.password);
      login(response.data.accessToken, response.data.user);
      router.push('/admin');
    } catch (err) {
      setError(t('auth.invalidCredentials'));
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-8 space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.email')}
        </label>
        <input
          type="email"
          {...register('email')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('auth.email')}
        />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.password')}
        </label>
        <input
          type="password"
          {...register('password')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="******"
        />
        {errors.password && (
          <p className="text-red-600 text-sm mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? t('auth.submitting') : t('auth.submit')}
      </button>

      <p className="text-center text-sm text-gray-600">
        {t('auth.demoHint')}
      </p>
    </form>
  );
}
