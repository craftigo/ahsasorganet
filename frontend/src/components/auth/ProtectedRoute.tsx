import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireUnit?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requireUnit }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isUnit, unitData, isRegistrationIncomplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-10 h-10 text-maroon animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-500">Verifying authorized session...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin route protection
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Unit route protection
  if (requireUnit) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }

    if (isRegistrationIncomplete && unitData) {
      return <Navigate to={`/register?complete=true&unit_id=${unitData.id}`} replace />;
    }

    if (!isUnit) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
