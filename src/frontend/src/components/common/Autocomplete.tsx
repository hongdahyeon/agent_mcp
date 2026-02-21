import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteProps {
    value?: any | any[];
    multiple?: boolean;
    placeholder?: string;
    onSearch: (query: string) => Promise<any[]>;
    onChange: (value: any) => void;
    onCreate?: (name: string) => Promise<any>;
    displayField?: string;
    valueField?: string;
    className?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
    value,
    multiple = false,
    placeholder = "검색어를 입력하세요...",
    onSearch,
    onChange,
    onCreate,
    displayField = "name",
    valueField = "id",
    className = ""
}) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce search
    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            return;
        }

        const handler = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await onSearch(query);
                setSuggestions(results);
                setIsOpen(results.length > 0 || !!onCreate);
                setSelectedIndex(-1);
            } catch (error) {
                console.error("Autocomplete search error:", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [query, onSearch, onCreate]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (item: any) => {
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            if (!currentValues.find(v => v[valueField] === item[valueField])) {
                onChange([...currentValues, item]);
            }
        } else {
            onChange(item);
        }
        setQuery('');
        setIsOpen(false);
        setSuggestions([]);
    };

    const handleCreate = async () => {
        if (onCreate && query.trim()) {
            const newItem = await onCreate(query.trim());
            handleSelect(newItem);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown') setIsOpen(true);
            return;
        }

        const maxIndex = suggestions.length + (onCreate ? 0 : -1);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSelect(suggestions[selectedIndex]);
                } else if (selectedIndex === suggestions.length && onCreate) {
                    handleCreate();
                } else if (query.trim() && onCreate && suggestions.length === 0) {
                    handleCreate();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const removeValue = (itemToRemove: any) => {
        if (multiple && Array.isArray(value)) {
            onChange(value.filter(v => v[valueField] !== itemToRemove[valueField]));
        }
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="flex items-center gap-2 p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white dark:bg-slate-800 transition-all duration-200 min-h-[42px]">
                <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    {multiple ? (
                        Array.isArray(value) && value.map((item, idx) => (
                            <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-sm font-medium animate-in fade-in zoom-in duration-200 border border-blue-200 dark:border-blue-800/50">
                                {item[displayField]}
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeValue(item); }}
                                    className="hover:text-blue-900 dark:hover:text-blue-200 focus:outline-none"
                                >
                                    &times;
                                </button>
                            </span>
                        ))
                    ) : (
                        value && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-md text-sm font-semibold border border-gray-200 dark:border-slate-600">
                                <span className="truncate max-w-[200px]">{value[displayField]}</span>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onChange(null); setQuery(''); }}
                                    className="hover:text-red-500 focus:outline-none transition-colors"
                                >
                                    &times;
                                </button>
                            </div>
                        )
                    )}
                    
                    {(!value || multiple) && (
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 outline-none min-w-[80px] text-sm text-gray-700 dark:text-slate-200 bg-transparent placeholder:text-gray-400 dark:placeholder:text-slate-500"
                            placeholder={multiple && Array.isArray(value) && value.length > 0 ? "" : placeholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => query.trim() && setIsOpen(true)}
                        />
                    )}
                </div>
                
                {loading && <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full self-center shrink-0"></div>}
            </div>

            {isOpen && (
                <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-auto scrollbar-hide py-1 animate-in slide-in-from-top-2 duration-200">
                    {suggestions.map((item, index) => (
                        <li
                            key={index}
                            className={`px-4 py-2 text-sm cursor-pointer transition-colors duration-150 ${
                                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                            }`}
                            onClick={() => handleSelect(item)}
                        >
                            {item[displayField]}
                        </li>
                    ))}
                    
                    {onCreate && query.trim() && !suggestions.find(s => s[displayField].toLowerCase() === query.trim().toLowerCase()) && (
                        <li
                            className={`px-4 py-2 text-sm cursor-pointer border-t border-gray-100 italic transition-colors duration-150 ${
                                selectedIndex === suggestions.length ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-blue-400 dark:text-blue-400'
                            }`}
                            onClick={handleCreate}
                        >
                            "+ {query}" 추가하기
                        </li>
                    )}
                    
                    {suggestions.length === 0 && !onCreate && (
                        <li className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500 text-center italic">
                            검색 결과가 없습니다.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default Autocomplete;
