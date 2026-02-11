import Layout from './Layout';
import PageHeader from './PageHeader';
import { PageLoadingSpinner } from './ui/loading-spinner';

const PageWrapper = ({
  children,
  title,
  subtitle,
  loading = false,
  headerAction,
  backButton,
  showHeader = true,
}) => {
  if (loading) {
    return (
      <Layout>
        <PageLoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {showHeader && (title || headerAction || backButton) && (
          <PageHeader title={title} subtitle={subtitle} action={headerAction} backButton={backButton} />
        )}
        {children}
      </div>
    </Layout>
  );
};

export default PageWrapper;
