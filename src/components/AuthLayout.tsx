import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type AuthFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type AuthLayoutProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  bottomPrompt: string;
  bottomActionLabel: string;
  bottomActionTo: string;
  heroHeadline: ReactNode;
  heroCopy: string;
  features: AuthFeature[];
};

const AuthLayout = ({
  icon: Icon,
  title,
  subtitle,
  children,
  bottomPrompt,
  bottomActionLabel,
  bottomActionTo,
  heroHeadline,
  heroCopy,
  features,
}: AuthLayoutProps) => {
  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-top" />
      <div className="auth-orb auth-orb-bottom" />
      <div className="auth-grid" aria-hidden="true" />

      {/* Option C: Abstract GPA graph background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden lg:block opacity-[0.06]">
        <svg
          className="absolute top-[20%] left-[-10%] w-[120%] h-auto text-white"
          viewBox="0 0 1000 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0,300 C150,300 250,150 400,150 C550,150 650,250 800,200 C900,166 950,50 1000,50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 8" />
          <path d="M0,350 C200,350 300,200 450,200 C600,200 700,280 850,220 C920,190 980,100 1000,100" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <circle cx="400" cy="150" r="4" fill="currentColor" />
          <circle cx="800" cy="200" r="4" fill="currentColor" />
          <circle cx="1000" cy="50" r="4" fill="currentColor" />
          <circle cx="450" cy="200" r="3" fill="currentColor" opacity="0.5" />
          <circle cx="850" cy="220" r="3" fill="currentColor" opacity="0.5" />
          <circle cx="200" cy="100" r="2" fill="currentColor" opacity="0.8" />
          <circle cx="300" cy="250" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="600" cy="80" r="2.5" fill="currentColor" opacity="0.7" />
          <circle cx="750" cy="300" r="1" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      <div className="hidden lg:flex auth-marketing">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="auth-marketing-inner"
        >
          <div className="auth-brand">
            <span className="auth-brand-mark" />
            <span className="auth-brand-name">GradeFlow</span>
          </div>

          <div className="space-y-6 max-w-2xl">
            <div className="space-y-5">
              <div className="auth-eyebrow">Built for smarter academic planning</div>
              <h1 className="auth-hero-title">{heroHeadline}</h1>
              <p className="auth-hero-copy">{heroCopy}</p>
            </div>

            <div className="auth-feature-stack">
              {features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.12 + index * 0.08 }}
                    className="auth-feature-card"
                  >
                    <div className="auth-feature-icon">
                      <FeatureIcon size={18} strokeWidth={2.1} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="auth-feature-title">{feature.title}</h2>
                      <p className="auth-feature-copy">{feature.description}</p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>

         
        </motion.div>
      </div>

      <div className="lg:hidden px-5 pt-8 pb-3 text-center">
        <div className="auth-brand justify-center">
          <span className="auth-brand-mark" />
          <span className="auth-brand-name">GradeFlow</span>
        </div>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Track your GPA, know exactly what you need to hit your target.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {features.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <span
                key={feature.title}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <FeatureIcon
                  size={14}
                  strokeWidth={2.1}
                  className="text-[var(--accent)]"
                />
                {feature.title}
              </span>
            );
          })}
        </div>
      </div>

      <div className="auth-form-shell">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
          className="auth-form-wrap"
        >
          <div className="auth-form-card">
            <div className="auth-card-header">
              <div className="auth-card-icon">
                <Icon size={20} strokeWidth={2.1} />
              </div>
              <div className="space-y-1">
                <h2 className="auth-card-title">{title}</h2>
                <p className="auth-card-subtitle">{subtitle}</p>
              </div>
            </div>

            {children}

            <div className="auth-card-footer">
              <p className="auth-card-footer-text">
                {bottomPrompt}{" "}
                <Link to={bottomActionTo} className="auth-card-footer-link">
                  {bottomActionLabel}
                </Link>
              </p>

              <div className="auth-security-note">
                <span aria-hidden="true">🔒</span>
                <span>Your data is secure and private</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <p className="auth-page-footer-credit">
        Made with <span aria-label="love">❤️</span> by Azeez
      </p>
    </div>
  );
};

export default AuthLayout;
