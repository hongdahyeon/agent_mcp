import clsx from 'clsx';
import { AlertCircle, Columns, Database, FileText, RefreshCw, Table } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SchemaManager() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<any[]>([]);
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schema' | 'data'>('schema');
  const [dataLimit, setDataLimit] = useState(100);

  // Load table list on mount
  useEffect(() => {
    fetchTables();
  }, []);

  // When table selected, load schema (and maybe data if tab active)
  useEffect(() => {
    if (selectedTable) {
      if (activeTab === 'schema') fetchSchema(selectedTable);
      else fetchData(selectedTable);
    }
  }, [selectedTable, activeTab]);

  const getHeaders = (): Record<string, string> => {
    const userStr = localStorage.getItem('user_session');
    if (!userStr) return {};
    const user = JSON.parse(userStr);
    return user.user_id ? { 'X-User-Id': String(user.user_id) } : {};
  };

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/tables', { headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTables(data.tables);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db/schema/${tableName}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSchema(data.columns); // [{cid, name, type, notnull, dflt_value, pk}, ...]
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db/data/${tableName}?limit=${dataLimit}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDataRows(data.rows);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSchemaTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NotNull</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PK</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {schema.map((col) => (
            <tr key={col.cid}>
              <td className="px-6 py-4 text-sm text-gray-500">{col.cid}</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{col.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{col.type}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{col.notnull ? 'YES' : 'NO'}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{col.dflt_value}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{col.pk ? 'YES' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDataTable = () => {
    if (dataRows.length === 0) return <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>;
    const columns = Object.keys(dataRows[0]);
    return (
      <div className="overflow-x-auto max-h-[600px]"> {/* Scrollable container for data */}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap max-w-xs truncate" title={String(row[col])}>
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Database className="w-6 h-6 mr-2 text-blue-600" />
          스키마 및 데이터 관리
        </h2>
        <p className="text-sm text-gray-500 mt-1">데이터베이스 테이블 구조를 확인하고 데이터를 조회합니다.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Main Content: 2 Columns */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Table List */}
        <div className="w-1/4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
           <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
             <h3 className="font-semibold text-gray-700">Tables</h3>
             <button onClick={fetchTables} className="text-gray-400 hover:text-blue-600">
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
                       "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center",
                       selectedTable === table 
                         ? "bg-blue-50 text-blue-700 font-medium" 
                         : "text-gray-600 hover:bg-gray-50"
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
        <div className="w-3/4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {selectedTable ? (
            <>
               {/* Detail Header */}
               <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-gray-800 flex items-center">
                   <Table className="w-5 h-5 mr-2 text-gray-500" />
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
                     {/* Data Toolbar */}
                     <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-xs font-medium text-gray-600">조회 개수 (Limit):</label>
                          <input 
                            type="number" 
                            value={dataLimit} 
                            onChange={(e) => setDataLimit(Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                        </div>
                        <button 
                          onClick={() => fetchData(selectedTable)} 
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
                        >
                          조회
                        </button>
                     </div>
                     <div className="flex-1 overflow-hidden">
                       {renderDataTable()}
                     </div>
                   </div>
                 )}
               </div>
            </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <Database className="w-16 h-16 mb-4 opacity-20" />
               <p>왼쪽 목록에서 테이블을 선택해주세요</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
