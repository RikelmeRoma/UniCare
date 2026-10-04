import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RoleType, CourseType } from '../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: RoleType[];
  allowedCourses?: CourseType[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowedCourses,
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica se o papel (Role) do usuário tem permissão
  if (allowedRoles && !allowedRoles.includes(user.perfil) && user.perfil !== 'rt') {
    // Referência Técnica (RT) possui acesso amplo institucional (RN-003)
    return <Navigate to="/nao-autorizado" state={{ from: location }} replace />;
  }

  // Verifica restrição de curso caso exista
  if (allowedCourses && !allowedCourses.includes(user.curso) && user.perfil !== 'rt') {
    return <Navigate to="/nao-autorizado" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};
