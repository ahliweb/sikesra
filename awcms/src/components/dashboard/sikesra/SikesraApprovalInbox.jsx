import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { usePermissions } from '@/contexts/PermissionContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, Building2, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SikesraApprovalInbox() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { tenantId } = useTenant();
  
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const canApprove = hasPermission('tenant.sikesra_approval.approve');
  
  useEffect(() => {
    if (tenantId) {
      fetchApprovals();
    }
  }, [tenantId]);
  
  const fetchApprovals = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('sikesra_entities')
      .select(`
        id,
        name,
        status,
        created_at,
        verified_kecamatan_at,
        validated_instansi_at,
        entity_type:sikesra_entity_types(id, name),
        village:administrative_regions!sikesra_entities_village_id_fkey(name),
        kecamatan:administrative_regions!sikesra_entities_kecamatan_id_fkey(name)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'verified_kecamatan')
      .is('deleted_at', null)
      .order('verified_kecamatan_at', { ascending: true });
    
    if (!error && data) {
      setApprovals(data);
    }
    
    setLoading(false);
  };
  
  if (!canApprove) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common.no_permission', 'Anda tidak memiliki akses ke halaman ini')}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {t('sikesra.approval_inbox', 'Kotak Persetujuan')}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              {t('sikesra.no_approvals', 'Tidak ada entitas menunggu persetujuan')}
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map(entity => (
                <div key={entity.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{entity.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {entity.entity_type?.name}
                          </span>
                          {entity.village && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entity.village.name}
                            </span>
                          )}
                          {entity.verified_kecamatan_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Terverifikasi: {new Date(entity.verified_kecamatan_at).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/cmspanel/sikesra/entities/${entity.id}`)}>
                        Lihat Detail
                      </Button>
                      <Button size="sm" onClick={() => navigate(`/cmspanel/sikesra/entities/${entity.id}/approve`)}>
                        Proses
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
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

export default SikesraApprovalInbox;
