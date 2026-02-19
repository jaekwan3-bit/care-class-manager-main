import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  variant?: "default" | "primary" | "accent" | "warning";
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/5 border-primary/20",
  accent: "bg-accent/5 border-accent/20",
  warning: "bg-warning/5 border-warning/20",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
};

const StatCard = ({ title, value, icon, description, variant = "default" }: StatCardProps) => {
  return (
    <div className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${iconStyles[variant]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
