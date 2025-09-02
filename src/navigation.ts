import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

// ==================================================================================================
// DATOS DEL ENCABEZADO (HEADER)
// ==================================================================================================
export const headerData = {
  // Un menú de navegación limpio y plano, sin menús desplegables
  links: [
    {
      text: 'Services',
      href: getPermalink('/services'), // Enlaza a tu nueva página de servicios
    },
    {
      text: 'Projects',
      href: getPermalink('/projects'), // <--- AÑADE ESTA LÍNEA
    },
    {
      text: 'Articles',
      href: '/articles', // Usa el helper para enlazar a la página principal de tus artículos
    },
    {
      text: 'Contact',
      href: getPermalink('/contact'), // Enlaza a tu página de contacto
    },
  ],

  // Eliminamos el botón de "Download"
  actions: [],
};

// ==================================================================================================
// DATOS DEL PIE DE PÁGINA (FOOTER)
// ==================================================================================================
export const footerData = {
  // Eliminamos las columnas de enlaces innecesarias
  links: [],
  
  // Mantenemos estos enlaces porque dan un aspecto profesional
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],

  // Actualiza esto con tus enlaces reales cuando los tengas
  socialLinks: [
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: 'linkedin.com/company/apex-data-lab' }, // <-- Pon aquí el link a tu página de compañía de LinkedIn
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/pythongurfer/apex-data-labs' }, // <-- Link a tu GitHub
  ],

  // Nota de pie de página actualizada
  footNote: `
    &copy; ${new Date().getFullYear()} Apex Data Labs. All rights reserved.
  `,
};