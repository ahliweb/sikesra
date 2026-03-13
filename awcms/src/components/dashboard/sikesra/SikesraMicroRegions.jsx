import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { usePermissions } from '@/contexts/PermissionContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MinCharSearchInput from '@/components/common/MinCharSearchInput';
import { useSearch } from '@/hooks/useSearch';

const MICRO_REGION_TYPES = {
  rt: { label: 'RT', color: 'bg-blue-100 text-blue-700' },
  rw: { label: 'RW', color: 'bg-green-100 text-green-700' },
  dusun: { label: 'Dusun', color: 'bg-amber-100 text-amber-700' },
  lingkungan: { label: 'Lingkungan', color: 'bg-purple-100 text-purple-700' },
  other: { label: 'Lainnya', color: 'bg-gray-100 text-gray-700' },
};

function SikesraMicroRegions({ showTrash = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { tenantId } = useTenant();
  
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  
  const canCreate = hasPermission('tenant.sikesra_micro_region.create');
  const canUpdate = hasPermission('tenant.sikesra_micro_region.update');
  const canDelete = hasPermission('tenant.sikesra_micro_region.delete');
  
  useEffect(() => {
    if (tenantId) {
      fetchRegions();
    }
  }, [tenantId, filterType, showTrash]);
  
  const fetchRegions = async () => {
    setLoading(true);
    
    let queryBuilder = supabase
      .from('sikesra_micro_regions')
      .select(`
        id,
        name,
        code,
        type,
        is_active,
        created_at,
        village:administrative_regions(id, name)
      `)
      .eq('tenant_id', tenantId);
    
    if (showTrash) {
      queryBuilder = queryBuilder.not.is('deleted_at', null);
    } else {
      queryBuilder = queryBuilder.is('deleted_at', null);
    }
    
    if (filterType !== 'all') {
      queryBuilder = queryBuilder.eq('type', filterType);
    }
    
    const { data, error } = await queryBuilder.order('name');
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setRegions(data || []);
    }
    
    setLoading(false);
  };
  
  const handleSoftDelete = async (regionId) => {
    const { error } = await supabase
      .from('sikesra_micro_regions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', regionId);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Berhasil', description: 'Wilayah mikro berhasil dihapus' });
      fetchRegions();
    }
  };
  
  const TypeBadge = ({ type }) => {
    const config = MICRO_REGION_TYPES[type] || MICRO_REGION_TYPES.other;
    return <Badge className={config.color}>{config.label}</Badge>;
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('sikesra.micro_regions', 'Wilayah Mikro')}
            </CardTitle>
            {canCreate && (
              <Button size="sm" onClick={() => navigate('/cmspanel/sikesra/regions/new')}>
                <Plus className="w-4 h-4 mr-1" />
                {t('common.add', 'Tambah')}
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Object.entries(MICRO_REGION_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : regions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showTrash ? 'Tidak ada wilayah di sampah' : 'Belum ada wilayah mikro'}
            </div>
          ) : (
            <div className="space-y-3">
              {regions.map(region => (
                <div key={region.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <div className="font-medium">{region.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <TypeBadge type={region.type} />
                        {region.code && <span>Kode: {region.code}</span>}
                        {region.village && <span>• {region.village.name}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={region.is_active ? 'default' : 'secondary'}>
                      {region.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => navigate(`/cmspanel/sikesra/regions/${region.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && !showTrash && (
                          <DropdownMenuItem className="text-red-600" onClick={() => handleSoftDelete(region.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SikesraMicroRegions;
