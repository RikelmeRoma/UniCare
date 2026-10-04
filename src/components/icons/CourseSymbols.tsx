import React from 'react';

export function PsychologyEmblem({ className = "w-24 h-24", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Símbolo Oficial da Psicologia: Letra Grega Psi (Ψ) em estilo clássico heráldico */}
      <path
        d="M47 12 h6 v76 h-6 z"
        fill="currentColor"
      />
      {/* Base e topo da coluna central */}
      <path
        d="M44 12 h12 v3 h-12 z M43 85 h14 v3 h-14 z"
        fill="currentColor"
      />
      {/* Curva dos braços do Psi */}
      <path
        d="M20 28 c0 20 12 36 27 38 v-5 c-12 -2 -21 -16 -21 -33 h-6 z M80 28 c0 20 -12 36 -27 38 v-5 c12 -2 21 -16 21 -33 h6 z"
        fill="currentColor"
      />
      {/* Extremidades dos braços (serifas) */}
      <path
        d="M17 28 h10 v3 h-10 z M73 28 h10 v3 h-10 z"
        fill="currentColor"
      />
      {/* Auréola / Anel heráldico sutil de fundo */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.4"
      />
    </svg>
  );
}

export function OdontologyEmblem({ className = "w-24 h-24", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Símbolo Oficial da Odontologia: Vara de Esculápio com a Serpente dentro do contorno dental anatômico */}
      {/* Vara central de Esculápio */}
      <path
        d="M48 10 h4 v80 h-4 z"
        fill="currentColor"
      />
      <circle cx="50" cy="10" r="3" fill="currentColor" />

      {/* Serpente sagrada enrolada na vara (3 voltas canônicas) */}
      <path
        d="M50 20 c8 -3 14 3 10 9 c-6 8 -16 1 -10 11 c7 11 16 3 10 15 c-6 10 -15 3 -9 15 c6 11 15 5 10 14 c-3 5 -8 4 -11 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cabeça da serpente no topo voltada para a esquerda */}
      <path
        d="M48 20 c-2 -4 -6 -2 -7 1 c-1 3 2 4 4 3 z"
        fill="currentColor"
      />

      {/* Contorno anatômico dental e anel de granada */}
      <path
        d="M32 30 C30 20 40 18 50 24 C60 18 70 20 68 30 C66 45 64 65 56 82 C53 87 50 82 48 82 C46 82 43 87 40 82 C32 65 30 45 32 30 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
      />
      {/* Círculo externo heráldico */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.4"
      />
    </svg>
  );
}

export function InstitutionalEmblem({ className = "w-24 h-24", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Brasão Heráldico Veritas com Coroa Mural de Castelo */}
      {/* Castelo / Ameias no topo */}
      <path
        d="M20 18 h12 v6 h8 v-6 h20 v6 h8 v-6 h12 v14 h-60 z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Escudo heráldico */}
      <path
        d="M20 32 h60 v26 c0 20 -18 30 -30 36 c-12 -6 -30 -16 -30 -36 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {/* Sol / Estrela interna */}
      <circle cx="50" cy="54" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M50 42 v24 M38 54 h24 M42 46 l16 16 M42 62 l16 -16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
