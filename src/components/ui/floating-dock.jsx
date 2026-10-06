import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  IconBrandGithub,
  IconBrandX,
  IconExchange,
  IconHome,
  IconNewSection,
  IconTerminal2,
} from "@tabler/icons-react";
import "./floating-dock.css";

export const FloatingDock = ({
  items = [],
  desktopClassName = "",
  mobileClassName = "",
  orientation = "horizontal",
  expanded = false,
  className = "",
}) => {
  return (
    <div className={`floating-dock-wrapper ${className}`.trim()}>
      <FloatingDockDesktop
        items={items}
        orientation={orientation}
        expanded={expanded}
        className={desktopClassName}
      />
      <FloatingDockMobile
        items={items}
        className={mobileClassName}
      />
    </div>
  );
};

const FloatingDockDesktop = ({
  items = [],
  className = "",
  orientation = "horizontal",
  expanded = false,
}) => {
  const mousePosition = useMotionValue(Infinity);
  const isVertical = orientation === "vertical";

  return (
    <motion.nav
      onMouseMove={(e) => {
        // No modo expandido não amplifica para manter estabilidade de leitura de texto
        if (expanded) return;
        mousePosition.set(isVertical ? e.clientY : e.clientX);
      }}
      onMouseLeave={() => mousePosition.set(Infinity)}
      className={`floating-dock-desktop ${isVertical ? "is-vertical" : "is-horizontal"} ${
        expanded ? "is-expanded" : ""
      } ${className}`.trim()}
      aria-label="Navegação flutuante"
    >
      {items.map((item, index) => (
        <IconContainer
          mousePosition={mousePosition}
          orientation={orientation}
          expanded={expanded}
          key={item.title || index}
          {...item}
        />
      ))}
    </motion.nav>
  );
};

const IconContainer = ({
  mousePosition,
  title,
  icon,
  href,
  to,
  onClick,
  isActive: explicitIsActive,
  orientation = "horizontal",
  expanded = false,
  ariaLabel,
  badge,
  className = "",
  titleClassName = "",
}) => {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const isVertical = orientation === "vertical";

  // Identificação de rota ativa se inserido em contexto de React Router
  let locationPathname = "";
  try {
    const loc = useLocation();
    locationPathname = loc?.pathname || "";
  } catch {
    // Fora de HashRouter / BrowserRouter
  }

  const targetPath = to || href;
  const isPathActive =
    targetPath &&
    (targetPath === "/"
      ? locationPathname === "/"
      : locationPathname.startsWith(targetPath));

  const isActive = explicitIsActive !== undefined ? explicitIsActive : isPathActive;

  // Distância do cursor ao centro do item
  const distance = useTransform(mousePosition, (val) => {
    if (expanded) return 9999;
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
    if (isVertical) {
      return val - bounds.y - bounds.height / 2;
    }
    return val - bounds.x - bounds.width / 2;
  });

  // Física elástica de ampliação (Aceternity UI / macOS Dock)
  const widthTransform = useTransform(distance, [-130, 0, 130], [42, 60, 42]);
  const heightTransform = useTransform(distance, [-130, 0, 130], [42, 60, 42]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  const widthIconTransform = useTransform(distance, [-130, 0, 130], [20, 28, 20]);
  const heightIconTransform = useTransform(distance, [-130, 0, 130], [20, 28, 20]);

  const widthIcon = useSpring(widthIconTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });
  const heightIcon = useSpring(heightIconTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  const content = (
    <>
      {/* Tooltip flutuante exclusivo do modo colapsado */}
      <AnimatePresence>
        {!expanded && hovered && title && (
          <motion.div
            initial={
              isVertical
                ? { opacity: 0, x: -8, y: "-50%" }
                : { opacity: 0, y: 10, x: "-50%" }
            }
            animate={
              isVertical
                ? { opacity: 1, x: 0, y: "-50%" }
                : { opacity: 1, y: 0, x: "-50%" }
            }
            exit={
              isVertical
                ? { opacity: 0, x: -6, y: "-50%" }
                : { opacity: 0, y: 6, x: "-50%" }
            }
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`floating-dock-tooltip ${isVertical ? "is-vertical" : "is-horizontal"} ${titleClassName}`.trim()}
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={expanded ? { width: 20, height: 20 } : { width: widthIcon, height: heightIcon }}
        className="floating-dock-icon"
      >
        {icon}
      </motion.div>

      {/* Rótulo exibido no modo expandido */}
      {expanded && title && (
        <span className="floating-dock-label-text">{title}</span>
      )}

      {badge}
    </>
  );

  const sharedStyle = expanded
    ? { width: "100%", height: 42 }
    : { width, height };

  const sharedProps = {
    ref,
    style: sharedStyle,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    className: `floating-dock-item ${isActive ? "is-active" : ""} ${className}`.trim(),
    "aria-label": ariaLabel || title,
    title: expanded ? undefined : undefined,
  };

  if (to) {
    return (
      <motion.div {...sharedProps}>
        <Link
          to={to}
          onClick={onClick}
          className="floating-dock-link"
          aria-label={ariaLabel || title}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  if (href) {
    return (
      <motion.a
        href={href}
        onClick={onClick}
        className="floating-dock-link"
        {...sharedProps}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`floating-dock-link ${sharedProps.className}`}
      style={sharedProps.style}
      onMouseEnter={sharedProps.onMouseEnter}
      onMouseLeave={sharedProps.onMouseLeave}
      ref={ref}
      aria-label={ariaLabel || title}
    >
      {content}
    </motion.button>
  );
};

const FloatingDockMobile = ({ items = [], className = "" }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`floating-dock-mobile ${className}`.trim()}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="floating-dock-mobile-menu"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: idx * 0.04 },
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: { delay: (items.length - 1 - idx) * 0.04 },
                }}
              >
                {item.to ? (
                  <Link
                    to={item.to}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      setOpen(false);
                    }}
                    className="floating-dock-item"
                    style={{ width: 44, height: 44 }}
                    aria-label={item.title}
                  >
                    <div style={{ width: 20, height: 20 }}>{item.icon}</div>
                  </Link>
                ) : item.href ? (
                  <a
                    href={item.href}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      setOpen(false);
                    }}
                    className="floating-dock-item"
                    style={{ width: 44, height: 44 }}
                    aria-label={item.title}
                  >
                    <div style={{ width: 20, height: 20 }}>{item.icon}</div>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      setOpen(false);
                    }}
                    className="floating-dock-item"
                    style={{ width: 44, height: 44 }}
                    aria-label={item.title}
                  >
                    <div style={{ width: 20, height: 20 }}>{item.icon}</div>
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="floating-dock-mobile-btn"
        aria-label="Alternar navegação"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export function FloatingDockDemo() {
  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Products",
      icon: (
        <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Components",
      icon: (
        <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Aceternity UI",
      icon: (
        <img
          src="https://cdn.21st.dev/assets/mirror/b0/b01d86a4b524d129b752a71ca8faf20c4f89447742e65315f1b8bc3e5e72745d.png"
          width={20}
          height={20}
          alt="Aceternity Logo"
        />
      ),
      href: "#",
    },
    {
      title: "Changelog",
      icon: (
        <IconExchange className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Twitter",
      icon: (
        <IconBrandX className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "GitHub",
      icon: (
        <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
  ];
  return (
    <div className="flex h-[35rem] w-full items-center justify-center">
      <FloatingDock mobileClassName="translate-y-20" items={links} />
    </div>
  );
}

export default FloatingDock;
