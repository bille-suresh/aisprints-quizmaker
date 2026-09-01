"use client";

import { McqActionsMenu } from "@/components/mcq-actions-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { McqSummary } from "@/lib/services/mcq-service.types";

type McqTableProps = {
  mcqs: McqSummary[];
  onDeleted: () => void;
};

export function McqTable({ mcqs, onDeleted }: McqTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Question</TableHead>
          <TableHead className="w-[70px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mcqs.map((mcq) => (
          <TableRow key={mcq.id}>
            <TableCell className="max-w-[200px] font-medium whitespace-normal">
              {mcq.name}
            </TableCell>
            <TableCell className="max-w-md whitespace-normal">
              <p className="line-clamp-2 text-muted-foreground">{mcq.question}</p>
            </TableCell>
            <TableCell className="text-right">
              <McqActionsMenu
                mcqId={mcq.id}
                mcqName={mcq.name}
                onDeleted={onDeleted}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
