import { type ReactNode, isValidElement } from "react";

interface EmptyStateProps {
  icon: any;
  title: string;
  description: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  const renderIcon = () => {
    if (!icon) return null;

    // If an already‑instantiated JSX element is passed, render it directly
    if (isValidElement(icon)) {
      return icon;
    }

    // Otherwise treat the prop as a component constructor
    const IconComponent = icon as any;
    return <IconComponent size={40} className="text-[var(--text-muted)]" />;
  };

  return (
    <div className="glass-card p-12 text-center animate-fade-in-up flex flex-col items-center justify-center">
      <div className="flex justify-center text-[var(--text-muted)] w-10 h-10 items-center">
        {renderIcon()}
      </div>
      <h3 className="text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mt-3 mb-2">
        {title}
      </h3>
      <p 
        className="text-[var(--text-sm)] text-[var(--text-secondary)] mx-auto text-center leading-[1.6] mb-6"
        style={{ maxWidth: "320px" }}
      >
        {description}
      </p>
      {action}
    </div>
  );
};

export default EmptyState;
