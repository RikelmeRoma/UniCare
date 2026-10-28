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

  // Cada RT responde pela própria clínica: o curso do cadastro vale também
  // para ela, sem visão global das duas clínicas.
  if (allowedCourses && !allowedCourses.includes(user.curso)) {
    return <Navigate to="/nao-autorizado" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};
