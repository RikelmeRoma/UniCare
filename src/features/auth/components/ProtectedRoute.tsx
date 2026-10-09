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

  // Verifica restrição de curso caso exista. O RT NÃO escapa: a vertical slice
  // exige que a Referência Técnica de odontologia não entre na clínica
  // psicológica — a salvaguarda institucional (RN-003) vale para auditoria e
  // relatórios, não para dados clínicos de outro curso.
  if (allowedCourses && !allowedCourses.includes(user.curso)) {
    return <Navigate to="/nao-autorizado" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};
