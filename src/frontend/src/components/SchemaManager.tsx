import clsx from 'clsx';
import { AlertCircle, Columns, Database, FileText, RefreshCw, Table } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

/**
 * 스키마 및 데이터 관리 컴포넌트
 * - 데이터베이스 전체 테이블 목록 조회
 * - 선택한 테이블의 스키마(컬럼 정보) 조회
 * - 선택한 테이블의 실제 데이터 조회 (Limit 기능 포함)
 */
export interface ColumnDefinition {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export function SchemaManager() {
  const [tables, setTables] = useState<string[]>([]); // 테이블 목록
  const [selectedTable, setSelectedTable] = useState<string | null>(null); // 현재 선택된 테이블 이름
  const [schema, setSchema] = useState<ColumnDefinition[]>([]); // 선택된 테이블의 스키마 정보
  const [dataRows, setDataRows] = useState<any[]>([]); // 선택된 테이블의 데이터 행
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지
  const [activeTab, setActiveTab] = useState<'schema' | 'data'>('schema'); // 현재 활성화된 탭 (스키마/데이터)

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  /**
   * 전체 테이블 목록 조회
   */
  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/tables', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTables(data.tables);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 특정 테이블 스키마 조회
   */
  const fetchSchema = useCallback(async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db/schema/${tableName}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSchema(data.columns); // [{cid, name, type, notnull, dflt_value, pk}, ...]
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 특정 테이블 데이터 조회 (Limit 파라미터 적용)
   */
  const fetchData = useCallback(async (tableName: string, pageNum: number = page, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db/data/${tableName}?page=${pageNum}&size=${size}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDataRows(data.rows);
      setTotal(data.total);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  /**
   * 컴포넌트 마운트 시 테이블 목록 로드
   */
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  /**
   * 테이블 선택 또는 탭 변경 시 데이터 다시 로드
   */
  useEffect(() => {
    if (selectedTable) {
      if (activeTab === 'schema') fetchSchema(selectedTable);
      else {
        if (activeTab === 'data') {
          setPage(1);
          fetchData(selectedTable, 1);
        }
      }
    }
  }, [selectedTable, activeTab, fetchSchema, fetchData]);

  useEffect(() => {
    if (selectedTable && activeTab === 'data') {
      fetchData(selectedTable, page, pageSize);
    }
  }, [page, pageSize, selectedTable, activeTab, fetchData]);

  /**
   * 컴포넌트 마운트 시 테이블 목록 로드
   */
  useEffect(() => {
    fetchTables();
  }, []);

  /**
   * 테이블 선택 또는 탭 변경 시 데이터 다시 로드
   */
  useEffect(() => {
    if (selectedTable) {
      if (activeTab === 'schema') fetchSchema(selectedTable);
      else {
        setPage(1); // 탭 변경 시 페이지 초기화
        fetchData(selectedTable, 1);
      }
    }
  }, [selectedTable, activeTab]);

  // 스키마 정보 테이블 렌더링
  const renderSchemaTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
        <thead className="bg-gray-50 dark:bg-slate-800/50 transition-colors">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">CID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">NotNull</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Default</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">PK</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800 transition-colors">
          {schema.map((col) => (
            <tr key={col.cid}>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{col.cid}</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-200">{col.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{col.type}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{col.notnull ? 'YES' : 'NO'}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{col.dflt_value}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{col.pk ? 'YES' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 데이터 조회 테이블 렌더링
  const renderDataTable = () => {
    if (dataRows.length === 0) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">데이터가 없습니다.</div>;
    const columns = Object.keys(dataRows[0]);
    return (
      <div className="flex-1 overflow-x-auto flex flex-col"> {/* Scrollable container for data */}
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10 transition-colors">
              <tr>
                {columns.map(col => (
                  <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800 transition-colors">
              {dataRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  {columns.map(col => (
                    <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap max-w-xs truncate" title={String(row[col])}>
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 font-pretendard">
      {/* Header */}
      <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
              스키마 및 데이터 관리
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">데이터베이스 테이블 구조를 확인하고 데이터를 조회합니다.</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center text-red-700 dark:text-red-400 transition-colors">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Main Content: 2 Columns */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Table List */}
        <div className="w-1/4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col transition-colors duration-300">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-xl transition-colors">
            <h3 className="font-semibold text-gray-700 dark:text-slate-300">Tables</h3>
            <button onClick={fetchTables} className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {tables.map(table => (
                <li key={table}>
                  <button
                    onClick={() => setSelectedTable(table)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center",
                      selectedTable === table
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <Table className="w-4 h-4 mr-2" />
                    {table}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Details */}
        <div className="w-3/4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-300">
          {selectedTable ? (
            <>
              {/* Detail Header */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center transition-colors">
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center">
                  <Table className="w-5 h-5 mr-2 text-gray-500 dark:text-slate-400" />
                  {selectedTable}
                </h3>
                <div className="flex space-x-2">
                  {/* Tabs */}
                  <button
                    onClick={() => setActiveTab('schema')}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      activeTab === 'schema' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Columns className="w-4 h-4" /> 스키마
                  </button>
                  <button
                    onClick={() => setActiveTab('data')}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      activeTab === 'data' ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <FileText className="w-4 h-4" /> 데이터
                  </button>
                </div>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'schema' && (
                  <div className="h-full overflow-y-auto">
                    {renderSchemaTable()}
                  </div>
                )}
                {activeTab === 'data' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-hidden">
                      {renderDataTable()}
                    </div>
                    <div className="bg-white dark:bg-slate-900 transition-colors">
                      <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(total / pageSize)}
                        pageSize={pageSize}
                        totalItems={total}
                        onPageChange={(p) => setPage(p)}
                        onPageSizeChange={(s) => {
                          setPageSize(s);
                          setPage(1);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-600">
              <Database className="w-16 h-16 mb-4 opacity-20" />
              <p>왼쪽 목록에서 테이블을 선택해주세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
