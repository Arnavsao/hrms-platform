'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: any) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }[];
  emptyState?: {
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
}

export function ResponsiveTable({
  columns,
  data,
  onRowClick,
  actions = [],
  emptyState,
  className,
}: ResponsiveTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  if (data.length === 0 && emptyState) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {emptyState.title}
            </h3>
            <p className="text-gray-500 mb-4">{emptyState.description}</p>
            {emptyState.action && (
              <Button onClick={emptyState.action.onClick}>
                {emptyState.action.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={cn(
                        'px-6 py-4 text-left text-sm font-semibold text-gray-900',
                        column.sortable && 'cursor-pointer hover:bg-gray-100',
                        column.className
                      )}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            <ChevronUp
                              className={cn(
                                'h-3 w-3',
                                sortConfig?.key === column.key && sortConfig.direction === 'asc'
                                  ? 'text-gray-900'
                                  : 'text-gray-400'
                              )}
                            />
                            <ChevronDown
                              className={cn(
                                'h-3 w-3 -mt-1',
                                sortConfig?.key === column.key && sortConfig.direction === 'desc'
                                  ? 'text-gray-900'
                                  : 'text-gray-400'
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                  {actions.length > 0 && (
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 text-sm">
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {actions.map((action, actionIndex) => (
                              <DropdownMenuItem
                                key={actionIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(row);
                                }}
                                className={cn(
                                  'cursor-pointer',
                                  action.variant === 'destructive' && 'text-red-600 focus:text-red-600'
                                )}
                              >
                                {action.icon && (
                                  <span className="mr-2">{action.icon}</span>
                                )}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {sortedData.map((row, index) => (
          <Card key={index} className="overflow-hidden border border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {columns.slice(0, 2).map((column) => (
                    <div key={column.key} className="mb-3 last:mb-0">
                      <p className="text-base font-medium text-gray-900">
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </p>
                    </div>
                  ))}
                </div>
                {actions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {actions.map((action, actionIndex) => (
                        <DropdownMenuItem
                          key={actionIndex}
                          onClick={() => action.onClick(row)}
                          className={cn(
                            'cursor-pointer',
                            action.variant === 'destructive' && 'text-red-600 focus:text-red-600'
                          )}
                        >
                          {action.icon && (
                            <span className="mr-2">{action.icon}</span>
                          )}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {columns.slice(2).map((column) => (
                  <div key={column.key} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">{column.label}:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
