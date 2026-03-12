import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { usePermissions } from '@/contexts/PermissionContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Eye, Edit, Trash2, RotateCcw, FileText, MapPin, Calendar, User, MoreHorizontal, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MinCharSearchInput from '@/components/common/MinCharSearchInput';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
  ready_for_submission: { label: 'Siap Diajukan', color: 'bg-blue-100 text-blue-700', icon: Clock },
  submitted_kelurahan: { label: 'Diajukan', color: 'bg-cyan-100 text-cyan-700', icon: Clock },
  under_verification_kecamatan: { label: 'Verifikasi Kecamatan', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  revision_requested_kecamatan: { label: 'Revisi Kecamatan', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  verified_kecamatan: { label: 'Terverifikasi Kecamatan', color: 'bg-teal-100 text-teal-700', icon: CheckCircle },
  under_validation_instansi: { label: 'Validasi Instansi', color: 'bg-purple-100 text-purple-700', icon: Clock },
  validated_instansi: { label: 'Tervalidasi Instansi', color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle },
  under_review_kabupaten: { label: 'Review Kabupaten', color: 'bg-violet-100 text-violet-700', icon: Clock },
  revision_requested_kabupaten: { label: 'Revisi Kabupaten', color: 'bg-rose-100 text-rose-700', icon: AlertCircle },
  approved_kabupaten: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  inactive: { label: 'Tidak Aktif', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  archived: { label: 'Arsip', color: 'bg-stone-100 text-stone-700', icon: FileText },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function SikesraEntityList({ showTrash = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { tenantId } = useTenant();
  
  const [entities, setEntities] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [filterEntityType, setFilterEntityType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [entityToRestore, setEntityToRestore] = useState(null);
  
  const {
    query,
    setQuery,
    debouncedQuery,
    isValid: isSearchValid,
    clearSearch
  } = useSearch({ minLength: 3, initialQuery: '' });
  
  const canCreate = hasPermission('tenant.sikesra_entity.create');
  const canUpdate = hasPermission('tenant.sikesra_entity.update');
  const canDelete = hasPermission('tenant.sikesra_entity.delete');
  const canRestore = hasPermission('tenant.sikesra_entity.restore');
  
  useEffect(() => {
    fetchEntityTypes();
  }, []);
  
  useEffect(() => {
    if (tenantId) {
      fetchEntities();
    }
  }, [tenantId, currentPage, itemsPerPage, filterEntityType, filterStatus, debouncedQuery, showTrash]);
  
  const fetchEntityTypes = async () => {
    const { data, error } = await supabase
      .from('sikesra_entity_types')
      .select('id, code, name')
      .eq('is_active', true)
      .order('sort_order');
    
    if (!error && data) {
      setEntityTypes(data);
    }
  };
  
  const fetchEntities = async () => {
    setLoading(true);
    
    let queryBuilder = supabase
      .from('sikesra_entities')
      .select(`
        id,
        name,
        slug,
        status,
        sikesra_id,
        created_at,
        updated_at,
        deleted_at,
        entity_type:sikesra_entity_types(id, code, name),
        village:administrative_regions!sikesra_entities_village_id_fkey(id, code, name),
        kecamatan:administrative_regions!sikesra_entities_kecamatan_id_fkey(id, code, name),
        kabupaten:administrative_regions!sikesra_entities_kabupaten_id_fkey(id, code, name)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    if (showTrash) {
      queryBuilder = queryBuilder.not.is('deleted_at', null);
    } else {
      queryBuilder = queryBuilder.is('deleted_at', null);
    }
    
    if (filterEntityType !== 'all') {
      queryBuilder = queryBuilder.eq('entity_type_id', filterEntityType);
    }
    
    if (filterStatus !== 'all') {
      queryBuilder = queryBuilder.eq('status', filterStatus);
    }
    
    if (debouncedQuery && isSearchValid) {
      queryBuilder = queryBuilder.or(`name.ilike.%${debouncedQuery}%,slug.ilike.%${debouncedQuery}%,sikesra_id.ilike.%${debouncedQuery}%`);
    }
    
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .range(from, to);
    
    const { data, error, count } = await queryBuilder;
    
    if (error) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: error.message,
      });
    } else {
      setEntities(data || []);
      setTotalItems(count || 0);
    }
    
    setLoading(false);
  };
  
  const handleSoftDelete = async () => {
    if (!entityToDelete) return;
    
    const { error } = await supabase
      .from('sikesra_entities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entityToDelete.id);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: error.message,
      });
    } else {
      toast({
        title: t('common.success', 'Berhasil'),
        description: t('sikesra.entity_deleted', 'Entitas berhasil dihapus'),
      });
      fetchEntities();
    }
    
    setDeleteDialogOpen(false);
    setEntityToDelete(null);
  };
  
  const handleRestore = async () => {
    if (!entityToRestore) return;
    
    const { error } = await supabase
      .from('sikesra_entities')
      .update({ deleted_at: null })
      .eq('id', entityToRestore.id);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: error.message,
      });
    } else {
      toast({
        title: t('common.success', 'Berhasil'),
        description: t('sikesra.entity_restored', 'Entitas berhasil dipulihkan'),
      });
      fetchEntities();
    }
    
    setRestoreDialogOpen(false);
    setEntityToRestore(null);
  };
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    
    return (
      <Badge className={cn('flex items-center gap-1 font-normal', config.color)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">
              {showTrash ? t('sikesra.trash_entities', 'Entitas di Sampah') : t('sikesra.entity_list', 'Daftar Entitas')}
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-2">
              <MinCharSearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('common.search', 'Cari...')}
                minLength={3}
                className="w-48"
              />
              
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('sikesra.entity_type', 'Jenis Entitas')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'Semua')}</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('sikesra.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'Semua')}</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : entities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showTrash ? t('sikesra.no_trash', 'Tidak ada entitas di sampah') : t('sikesra.no_entities', 'Belum ada entitas')}
            </div>
          ) : (
            <div className="space-y-3">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">{entity.name}</h3>
                        {entity.sikesra_id && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {entity.sikesra_id}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {entity.entity_type?.name || '-'}
                        </span>
                        
                        {entity.village && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {entity.village.name}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(entity.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <StatusBadge status={entity.status} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('common.actions', 'Aksi')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => navigate(`/cmspanel/sikesra/entities/${entity.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          {t('common.view', 'Lihat')}
                        </DropdownMenuItem>
                        
                        {!showTrash && canUpdate && (
                          <DropdownMenuItem onClick={() => navigate(`/cmspanel/sikesra/entities/${entity.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('common.edit', 'Edit')}
                          </DropdownMenuItem>
                        )}
                        
                        {showTrash && canRestore && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEntityToRestore(entity);
                              setRestoreDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('common.restore', 'Pulihkan')}
                          </DropdownMenuItem>
                        )}
                        
                        {!showTrash && canDelete && (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setEntityToDelete(entity);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete', 'Hapus')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t('common.showing', 'Menampilkan')} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} {t('common.of', 'dari')} {totalItems}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  {t('common.previous', 'Sebelumnya')}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  {t('common.next', 'Selanjutnya')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sikesra.delete_confirm_title', 'Hapus Entitas?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sikesra.delete_confirm_desc', 'Entitas akan dipindahkan ke sampah dan dapat dipulihkan nanti.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Batal')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete', 'Hapus')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sikesra.restore_confirm_title', 'Pulihkan Entitas?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sikesra.restore_confirm_desc', 'Entitas akan dipulihkan dan kembali ke daftar utama.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Batal')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              {t('common.restore', 'Pulihkan')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SikesraEntityList;
