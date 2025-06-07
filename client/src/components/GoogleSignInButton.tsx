'use client';

import React, { useEffect, useRef } from 'react';
import { authAPI } from '@/utils/api';
import Cookies from 'js-cookie';

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
  text?: string;
  theme?: 'outline' | 'filled_blue' | 'filled_black';
}

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = 'signin_with',
  theme = 'outline'
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google) {
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initializeGoogleSignIn();
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    } else {
      initializeGoogleSignIn();
    }
  }, []);

  const initializeGoogleSignIn = () => {
    if (window.google && buttonRef.current) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme,
        size: 'large',
        text,
        width: 300,
        logo_alignment: 'left',
      });
    }
  };

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      const result = await authAPI.googleSignIn(response.credential);

      // Store JWT token in cookie
      Cookies.set('auth_token', result.token, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      console.log('Google sign-in successful:', result.user);

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      const errorMessage = error.response?.data?.error || 'Google sign-in failed';
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  return (
    <div className="flex justify-center">
      <div ref={buttonRef} />
    </div>
  );
};

export default GoogleSignInButton;
