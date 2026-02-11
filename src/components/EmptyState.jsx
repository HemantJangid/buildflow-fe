const EmptyState = ({ message, action }) => {
  return (
    <div className="rounded-lg border border-border py-8 text-center text-sm text-muted-foreground">
      <p>{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
