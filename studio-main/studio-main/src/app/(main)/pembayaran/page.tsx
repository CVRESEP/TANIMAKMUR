
"use client";

import * as React from "react";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableHeader,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp, PlusCircle, Search, Trash2, Pencil, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate, toInputDate, parseCurrency, toTitleCase } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { getPembayaran, addPembayaran, updatePembayaran, deletePembayaran } from "@/services/pembayaranService";
import { getPenyaluranKios } from "@/services/penyaluranKiosService";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Combobox } from "@/components/ui/combobox";
import { DateFilter } from "@/components/ui/date-filter";
import { Pagination } from "@/components/ui/pagination";


const FormComponent = ({ item, onSave, onCancel, penyaluranData, pembayaranData }: { item?: any, onSave: (item: any) => void, onCancel: () => void, penyaluranData: any[], pembayaranData: any[] }) => {
    const [formData, setFormData] = React.useState({
        kabupaten: "",
        noDo: "",
        nomorPenyaluran: "",
        namaKios: "",
        tanggal: new Date().toISOString().split('T')[0],
        totalBayar: 0,
        ...item,
    });
    
    const [penyaluranOptions, setPenyaluranOptions] = React.useState<{value: string, label: string}[]>([]);
    
    const totalTagihan = React.useMemo(() => {
        if (!formData.nomorPenyaluran) return 0;

        const penyaluran = penyaluranData.find(p => p.nomorPenyaluran === formData.nomorPenyaluran);
        if (!penyaluran) return 0;
        
        const totalPembayaranTempo = pembayaranData
            .filter(p => p.nomorPenyaluran === formData.nomorPenyaluran && p.id !== formData.id)
            .reduce((sum, p) => sum + p.totalBayar, 0);

        return penyaluran.total - (penyaluran.diBayar || 0) - totalPembayaranTempo;
    }, [formData.nomorPenyaluran, formData.id, penyaluranData, pembayaranData]);
    
    React.useEffect(() => {
        if (item) {
            setFormData(prev => ({ ...prev, ...item, tanggal: toInputDate(item.tanggal) || new Date().toISOString().split('T')[0] }));
            if (item.noDo) {
                 const relatedPenyaluran = penyaluranData.filter(p => p.noDo === item.noDo && p.nomorPenyaluran);
                 setPenyaluranOptions(relatedPenyaluran.map(p => ({ value: p.nomorPenyaluran, label: p.nomorPenyaluran })));
            }
        }
    }, [item, penyaluranData]);

    const handleNoDoChange = (noDo: string) => {
        const relatedPenyaluran = penyaluranData.filter(p => p.noDo === noDo && p.nomorPenyaluran);
        const options = relatedPenyaluran.map(p => ({ value: p.nomorPenyaluran, label: p.nomorPenyaluran }));
        setPenyaluranOptions(options);

        // Reset fields first
        setFormData(prev => ({
            ...prev,
            noDo,
            kabupaten: "",
            namaKios: "",
            nomorPenyaluran: "",
        }));

        // If there's only one option, select it automatically
        if (options.length === 1) {
            handlePenyaluranChange(options[0].value);
        }
    };

    const handlePenyaluranChange = (nomorPenyaluran: string) => {
        const selectedPenyaluran = penyaluranData.find(p => p.nomorPenyaluran === nomorPenyaluran);
        if(selectedPenyaluran) {
            setFormData(prev => ({
                ...prev,
                nomorPenyaluran,
                kabupaten: selectedPenyaluran.kabupaten,
                namaKios: selectedPenyaluran.namaKios,
            }));
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isCurrency = name === 'totalBayar';
        setFormData(prev => ({ ...prev, [name]: isCurrency ? parseCurrency(value) : value.toUpperCase() }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    
    const handleLunasClick = () => {
        setFormData(prev => ({ ...prev, totalBayar: totalTagihan }));
    };
    
    const noDoOptions = React.useMemo(() => {
        const options = [...new Set(penyaluranData.map(p => p.noDo).filter(Boolean))];
        return options.map(op => ({ value: op, label: op }));
    }, [penyaluranData]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
                 <div>
                    <Label htmlFor="noDo">NO DO</Label>
                    <Combobox
                        options={noDoOptions}
                        value={formData.noDo}
                        onChange={(value) => handleNoDoChange(value)}
                        placeholder="PILIH NO DO"
                        searchPlaceholder="CARI NO DO..."
                        emptyPlaceholder="NO DO TIDAK DITEMUKAN"
                    />
                </div>
                 <div>
                    <Label htmlFor="nomorPenyaluran">NO PENYALURAN</Label>
                    <Combobox
                        options={penyaluranOptions}
                        value={formData.nomorPenyaluran}
                        onChange={(value) => handlePenyaluranChange(value)}
                        placeholder="PILIH NO PENYALURAN"
                        searchPlaceholder="CARI NO PENYALURAN..."
                        emptyPlaceholder="NO PENYALURAN TIDAK DITEMUKAN"
                        disabled={!formData.noDo}
                    />
                </div>
                <div>
                    <Label htmlFor="kabupaten">KABUPATEN</Label>
                    <Input id="kabupaten" name="kabupaten" value={formData.kabupaten} readOnly />
                </div>
                <div>
                    <Label htmlFor="namaKios">NAMA KIOS</Label>
                    <Input id="namaKios" name="namaKios" value={formData.namaKios} readOnly />
                </div>
                <div><Label htmlFor="tanggal">TANGGAL</Label><Input id="tanggal" name="tanggal" type="date" value={toInputDate(formData.tanggal)} onChange={handleChange} required /></div>
                <div />
                <div><Label>TOTAL TAGIHAN</Label><Input value={formatCurrency(totalTagihan)} readOnly /></div>
                <div>
                    <Label htmlFor="totalBayar">TOTAL BAYAR</Label>
                    <Input id="totalBayar" name="totalBayar" value={formatCurrency(formData.totalBayar)} onChange={handleChange} required />
                    <Button type="button" variant="link" className="p-0 h-auto text-xs mt-1" onClick={handleLunasClick}>
                        LUNAS
                    </Button>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={onCancel}>BATAL</Button>
                <Button type="submit">SIMPAN</Button>
            </DialogFooter>
        </form>
    );
};


export default function PembayaranPage() {
    const { toast } = useToast();
    const [data, setData] = React.useState<any[]>([]);
    const [allPenyaluranData, setAllPenyaluranData] = React.useState<any[]>([]);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedKabupaten, setSelectedKabupaten] = React.useState("SEMUA");
    const [dateFilteredData, setDateFilteredData] = React.useState<any[]>([]);
    const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<any | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasFetchedData, setHasFetchedData] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(25);
    const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [pembayaran, penyaluran] = await Promise.all([getPembayaran(), getPenyaluranKios()]);
            setData(pembayaran);
            setAllPenyaluranData(penyaluran);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal memuat data." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleShowData = () => {
        setHasFetchedData(true);
        fetchData();
    };

    const kabupatenOptions = ["SEMUA", "MAGETAN", "SRAGEN"];

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
          setSelectedRows(paginatedData.map((item) => item.id));
        } else {
          setSelectedRows([]);
        }
      };
    
      const handleSelectRow = (id: string) => {
        setSelectedRows((prev) =>
          prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
      };
    
    const handleDelete = async () => {
        const originalData = [...data];
        const itemsToDelete = data.filter(item => selectedRows.includes(item.id));
        
        setData(prev => prev.filter(item => !selectedRows.includes(item.id)));
        setSelectedRows([]);

        try {
            await deletePembayaran(selectedRows);
            toast({ title: "Sukses", description: `${itemsToDelete.length} data berhasil dihapus.` });
        } catch (error) {
            setData(originalData);
            console.error("Failed to delete data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data. Mengembalikan perubahan." });
        }
    };
    
    const handleSave = async (item: any) => {
        const isEditing = !!item.id;
        const originalData = [...data];
        
        setIsAddDialogOpen(false);
        setEditingItem(null);

        if (isEditing) {
            setData(prev => prev.map(d => d.id === item.id ? item : d));
        } else {
            const tempId = `temp-${Date.now()}`;
            const newItem = { ...item, id: tempId };
            setData(prev => [newItem, ...prev]);
        }

        try {
            if (isEditing) {
                await updatePembayaran(item.id, item);
                toast({ title: "Sukses", description: "Data berhasil diperbarui." });
            } else {
                const newId = await addPembayaran(item);
                setData(prev => prev.map(d => d.id.startsWith('temp-') ? { ...item, id: newId } : d));
                toast({ title: "Sukses", description: "Data berhasil ditambahkan." });
            }
        } catch (error) {
            setData(originalData);
            console.error("Failed to save data:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data." });
        }
    };
    
    const sortedData = React.useMemo(() => {
        let sortableItems = [...dateFilteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
    
                if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
                if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
    
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    if (aValue.toLowerCase() < bValue.toLowerCase()) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (aValue.toLowerCase() > bValue.toLowerCase()) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                } else {
                    if (aValue < bValue) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (aValue > bValue) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                }
                return 0;
            });
        } else {
            sortableItems.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        }
        return sortableItems;
    }, [dateFilteredData, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = sortedData
        .filter(item => selectedKabupaten === "SEMUA" || item.kabupaten === selectedKabupaten)
        .filter((item) =>
            Object.values(item).some((val) =>
            String(val).toUpperCase().includes(searchTerm.toUpperCase())
        )
    );

    const totalPages = itemsPerPage > 0 ? Math.ceil(filteredData.length / itemsPerPage) : 1;

    const paginatedData = itemsPerPage > 0
        ? filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : filteredData;

    const handleExportXlsx = () => {
        const dataToExport = filteredData.map(item => ({
            'KABUPATEN': item.kabupaten,
            'NO DO': item.noDo,
            'NO PENYALURAN': item.nomorPenyaluran,
            'NAMA KIOS': item.namaKios,
            'TANGGAL': formatDate(item.tanggal),
            'TOTAL BAYAR': item.totalBayar,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pembayaran");
        XLSX.writeFile(workbook, "Laporan_Pembayaran.xlsx");
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        doc.text("Laporan Pembayaran", 14, 16);
        (doc as any).autoTable({
            head: [['KABUPATEN', 'NO DO', 'NO PENYALURAN', 'NAMA KIOS', 'TANGGAL', 'TOTAL BAYAR']],
            body: filteredData.map(item => [
                item.kabupaten,
                item.noDo,
                item.nomorPenyaluran,
                item.namaKios,
                formatDate(item.tanggal),
                formatCurrency(item.totalBayar)
            ]),
            startY: 20,
        });
        doc.save('laporan_pembayaran.pdf');
    };
    
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedKabupaten, dateFilteredData, itemsPerPage, sortConfig]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2 items-center flex-wrap">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="CARI..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={selectedKabupaten} onValueChange={setSelectedKabupaten}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="PILIH KABUPATEN" />
                </SelectTrigger>
                <SelectContent>
                    {kabupatenOptions.map(kab => <SelectItem key={kab} value={kab}>{toTitleCase(kab)}</SelectItem>)}
                </SelectContent>
            </Select>
            <DateFilter data={data} onFilterChange={setDateFilteredData} />
            <Button onClick={handleShowData}>TAMPILKAN DATA</Button>
        </div>
        <div className="flex gap-2">
            {selectedRows.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            HAPUS ({selectedRows.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>APAKAH ANDA YAKIN?</AlertDialogTitle>
                        <AlertDialogDescription>
                            TINDAKAN INI TIDAK DAPAT DIBATALKAN. INI AKAN MENGHAPUS DATA YANG ANDA PILIH SECARA PERMANEN.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>BATAL</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>HAPUS</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <Button variant="outline" disabled>
                <FileUp className="mr-2 h-4 w-4" />
                IMPORT
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  EXPORT
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportXlsx}>EXCEL</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isAddDialogOpen || !!editingItem} onOpenChange={(open) => { if (!open) { setIsAddDialogOpen(false); setEditingItem(null); }}}>
                <DialogTrigger asChild>
                    <Button onClick={() => { setEditingItem(null); setIsAddDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        TAMBAH DATA
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>{editingItem ? 'EDIT' : 'TAMBAH'} DATA PEMBAYARAN</DialogTitle>
                    </DialogHeader>
                    <FormComponent 
                        item={editingItem} 
                        onSave={handleSave} 
                        onCancel={() => { setIsAddDialogOpen(false); setEditingItem(null); }}
                        penyaluranData={allPenyaluranData}
                        pembayaranData={data}
                    />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedRows.length > 0 && selectedRows.length === paginatedData.length}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
              </TableHead>
              <TableHead>NO</TableHead>
              <SortableHeader sortKey="kabupaten" sortConfig={sortConfig} onSort={handleSort}>KABUPATEN</SortableHeader>
              <SortableHeader sortKey="noDo" sortConfig={sortConfig} onSort={handleSort}>NO DO</SortableHeader>
              <SortableHeader sortKey="nomorPenyaluran" sortConfig={sortConfig} onSort={handleSort}>NO PENYALURAN</SortableHeader>
              <SortableHeader sortKey="namaKios" sortConfig={sortConfig} onSort={handleSort}>NAMA KIOS</SortableHeader>
              <SortableHeader sortKey="tanggal" sortConfig={sortConfig} onSort={handleSort}>TANGGAL</SortableHeader>
              <SortableHeader sortKey="totalBayar" sortConfig={sortConfig} onSort={handleSort}>TOTAL BAYAR</SortableHeader>
              <TableHead>AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center">Memuat data...</TableCell></TableRow>
            ) : !hasFetchedData ? (
                <TableRow><TableCell colSpan={9} className="text-center">Klik "Tampilkan Data" untuk melihat catatan.</TableCell></TableRow>
            ) : paginatedData.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(item.id)}
                    onCheckedChange={() => handleSelectRow(item.id)}
                  />
                </TableCell>
                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell>{item.kabupaten}</TableCell>
                <TableCell>{item.noDo}</TableCell>
                <TableCell>{item.nomorPenyaluran}</TableCell>
                <TableCell>{item.namaKios}</TableCell>
                <TableCell>{formatDate(item.tanggal)}</TableCell>
                <TableCell>{formatCurrency(item.totalBayar)}</TableCell>
                <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
       {hasFetchedData && totalPages > 0 && (
        <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
                Baris per halaman
                <Select value={`${itemsPerPage}`} onValueChange={value => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-20">
                        <SelectValue placeholder={`${itemsPerPage}`} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="-1">Semua</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {itemsPerPage > 0 && (
                <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                />
            )}
        </div>
      )}
    </main>
  );
}

    