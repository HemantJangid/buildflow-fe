const PageHeader = ({ title, subtitle, action, backButton }) => {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        {backButton && <div className="mb-2">{backButton}</div>}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default PageHeader;
