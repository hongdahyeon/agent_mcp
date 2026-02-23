import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
    currentPage: number;
    totalPages: number; // calculated as Math.ceil(totalItems / pageSize)
    pageSize: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    className
}: PaginationProps) {
    const pageSizeOptions = [10, 20, 50, 100];

    // Helper to generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5; // Number of page buttons to show

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Logic to show a window of pages around current page
            let startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
        }
        return pages;
    };

    return (
        <div className={clsx("flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 px-4 py-3 border-t border-gray-200 dark:border-slate-800 sm:px-6 transition-colors duration-300", className)}>
            {/* Left: Total Count & Page Size (Mobile friendly: stacked or wrapped) */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start font-pretendard">
                {totalItems !== undefined && (
                    <p className="text-sm text-gray-700 dark:text-slate-400">
                        전체 <span className="font-medium text-gray-900 dark:text-slate-200">{totalItems}</span>개
                    </p>
                )}

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-slate-400 whitespace-nowrap">보기</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            onPageSizeChange(Number(e.target.value));
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 pl-3 pr-8 text-base text-gray-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border transition-colors"
                    >
                        {pageSizeOptions.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Right: Navigation */}
            <div className="flex items-center gap-2 font-pretendard">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">이전</span>
                </button>

                <div className="hidden sm:flex gap-1">
                    {getPageNumbers().map(pageNum => (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={clsx(
                                "relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                currentPage === pageNum
                                    ? "z-10 bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                            )}
                        >
                            {pageNum}
                        </button>
                    ))}
                </div>

                {/* Mobile Page Indicator (Simpler) */}
                <span className="sm:hidden text-sm text-gray-700 dark:text-slate-400">
                    {currentPage} / {Math.max(1, totalPages)}
                </span>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">다음</span>
                </button>
            </div>
        </div>
    );
}
