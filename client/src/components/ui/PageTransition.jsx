import { Outlet, useLocation } from "react-router-dom";

/**
 * PageTransition — remounts page content (keyed by pathname) so the CSS
 * `page-anim` entrance plays on every navigation. Respects
 * prefers-reduced-motion via the global rule in index.css.
 */
export default function PageTransition({ className = "" }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className={`page-anim ${className}`}>
      <Outlet />
    </div>
  );
}
