import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const PageHeader = ({ title, description, breadcrumbs = [], actions, children, icon: TitleIcon }) => {
    return (
        <div className="col-span-full space-y-4">
            <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex flex-wrap items-center gap-x-1 gap-y-1 text-xs font-semibold text-muted-foreground">
                    <li className="inline-flex items-center">
                        <Link
                            to="/cmspanel"
                            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                            <Home className="h-3.5 w-3.5" />
                            Home
                        </Link>
                    </li>
                    {breadcrumbs.map((crumb, index) => (
                        <li key={index} className="inline-flex items-center gap-1">
                            <div className="flex items-center">
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                                {crumb.href ? (
                                    <Link
                                        to={crumb.href}
                                        className="ml-1 rounded-full border border-transparent px-2 py-1 text-muted-foreground transition-colors hover:border-border/70 hover:bg-accent/60 hover:text-foreground"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="ml-1 rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-foreground">{crumb.label}</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            </nav>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {TitleIcon && (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                                    <TitleIcon className="h-5 w-5" />
                                </span>
                            )}
                            <span className="truncate">{title}</span>
                        </h1>

                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                        {children && <div className="pt-1.5">{children}</div>}
                    </div>

                    {actions && (
                        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-background/70 p-1.5">
                            {Array.isArray(actions) ? actions : <>{actions}</>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default PageHeader;
