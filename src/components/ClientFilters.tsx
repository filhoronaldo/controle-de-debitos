
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Client } from "@/types/client";

interface ClientFiltersProps {
  nameFilter: string;
  statusFilter: string;
  onNameFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

export function ClientFilters({
  nameFilter,
  statusFilter,
  onNameFilterChange,
  onStatusFilterChange
}: ClientFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4">
      <div className="flex-1">
        <Label htmlFor="nameFilter">Nome do Cliente</Label>
        <Input
          id="nameFilter"
          placeholder="Filtrar por nome..."
          value={nameFilter}
          onChange={(e) => onNameFilterChange(e.target.value)}
        />
      </div>
      <div className="w-full md:w-64">
        <Label htmlFor="statusFilter">Situação</Label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger id="statusFilter">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="em_dia">Em dia</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="atrasado_parcial">Atrasado - Parcial</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
