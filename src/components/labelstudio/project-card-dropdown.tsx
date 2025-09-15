'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DownloadIcon, Edit3Icon, Ellipsis, Trash2Icon } from 'lucide-react';

export function ProjectCardDropdown({
  onEditAction,
  onExportAction,
}: {
  onEditAction?: () => void;
  onExportAction?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEditAction?.();
          }}
        >
          <Edit3Icon className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {/*<DropdownMenuItem*/}
        {/*  onClick={(e) => {*/}
        {/*    e.stopPropagation();*/}
        {/*    console.log('Duplicate');*/}
        {/*  }}*/}
        {/*>*/}
        {/*  <CopyPlusIcon className="mr-2 h-4 w-4" />*/}
        {/*  Duplicate*/}
        {/*</DropdownMenuItem>*/}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onExportAction?.();
          }}
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            console.log('Delete');
          }}
          variant="destructive"
        >
          <Trash2Icon className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
