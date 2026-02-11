import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/utils";

/**
 * DataTable - Reusable table with loading, empty states, and pagination.
 * This is the single place for table pagination UI (First / Prev / Next / Last).
 * Do not duplicate pagination controls elsewhere.
 *
 * Server-side pagination: pass pagination object { total, page, limit, totalPages } and onPageChange. Data = current page only.
 * No pagination: don't pass pagination or onPageChange. Data = full list, displayed as-is.
 */
const DataTable = ({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found.",
  rowKey = (row) => row._id,
  className,
  // Accept pagination object directly from API response (required for server-side pagination)
  pagination: paginationProp,
  onPageChange,
}) => {
  // Extract pagination values from pagination object
  const paginationData = useMemo(() => {
    if (paginationProp) {
      // Use pagination object from API response
      return {
        total: paginationProp.total != null ? Number(paginationProp.total) : 0,
        page: paginationProp.page != null ? Number(paginationProp.page) : 1,
        limit: paginationProp.limit != null ? Number(paginationProp.limit) : 10,
        totalPages:
          paginationProp.totalPages != null
            ? Number(paginationProp.totalPages)
            : 1,
      };
    }
    // No pagination: display all data as-is
    return null;
  }, [paginationProp]);

  // Server pagination: parent provides onPageChange (and pagination object)
  const isServerPaginated =
    typeof onPageChange === "function" && paginationData !== null;
  const currentPage = isServerPaginated ? paginationData.page : 1;
  const totalCountSafe = paginationData?.total ?? 0;
  const serverPageSize = paginationData?.limit ?? 10;

  // Server-side: use data as-is; No pagination: display all data
  const { paginatedData, totalPages, startIndex, endIndex, total } =
    useMemo(() => {
      if (isServerPaginated) {
        const count = data?.length ?? 0;
        const totalFromApi = totalCountSafe;
        const pageSizeToUse = serverPageSize;
        // If total is 0 but we have a full page, assume there may be more so Next is enabled
        const effectiveTotal =
          totalFromApi === 0 && count >= pageSizeToUse
            ? currentPage * pageSizeToUse + 1
            : totalFromApi;
        // Use totalPages from pagination object if available, otherwise calculate
        const totalPagesCalc =
          paginationData.totalPages > 1
            ? paginationData.totalPages
            : Math.max(1, Math.ceil(effectiveTotal / pageSizeToUse));
        const start = (currentPage - 1) * pageSizeToUse;
        return {
          paginatedData: data ?? [],
          totalPages: totalPagesCalc,
          startIndex: totalFromApi === 0 ? 0 : start + 1,
          endIndex: totalFromApi === 0 ? 0 : start + count,
          total:
            totalFromApi === 0 && count >= pageSizeToUse
              ? effectiveTotal
              : totalFromApi,
        };
      }
      // No pagination: display all data as-is
      const dataLength = data?.length ?? 0;
      return {
        paginatedData: data ?? [],
        totalPages: 1,
        startIndex: dataLength > 0 ? 1 : 0,
        endIndex: dataLength,
        total: dataLength,
      };
    }, [
      data,
      currentPage,
      isServerPaginated,
      totalCountSafe,
      serverPageSize,
      paginationData?.totalPages,
    ]);

  const handlePageChange = (newPage) => {
    if (isServerPaginated && typeof onPageChange === "function") {
      onPageChange(newPage);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const showPagination =
    isServerPaginated && (total > 0 || (data?.length ?? 0) > 0);
  const paginationBar = showPagination && (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
      <p className="text-muted-foreground shrink-0">
        Showing {total === 0 ? 0 : startIndex}-{endIndex} of {total}
      </p>
      <div className="flex items-center gap-1 flex-wrap min-w-0 justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="shrink-0"
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="shrink-0"
        >
          Prev
        </Button>
        <span className="px-3 text-muted-foreground whitespace-nowrap shrink-0">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const nextPage = Math.min(totalPages, currentPage + 1);
            handlePageChange(nextPage);
          }}
          disabled={currentPage >= totalPages}
          className="shrink-0"
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="shrink-0"
        >
          Last
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {paginationBar}

      <div className={cn("rounded-lg border border-border", className)}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "h-8 px-3 py-1.5 text-muted-foreground font-medium text-xs",
                    col.hideOn && `hidden ${col.hideOn}:table-cell`,
                    col.headerClassName,
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, idx) => (
              <TableRow key={rowKey(row, idx)} className="hover:bg-muted/50">
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "px-3 py-1.5 text-sm",
                      col.hideOn && `hidden ${col.hideOn}:table-cell`,
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row, idx) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {paginationBar}
    </div>
  );
};

export default DataTable;
