import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { usePermissions } from '@/contexts/PermissionContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { FileCheck, Building2, MapPin, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const VERIFICATION_LEVELS = {
  kecamatan: { label: 'Verifikasi Kecamatan', permission: 'tenant.sikesra_verification.verify_kecamatan' },
  instansi: { label: 'Validasi Instansi', permission: 'tenant.sikesra_verification.validate_instansi' },
  kabupaten: { label: 'Verifikasi Kabupaten', permission: 'tenant.sikesra_verification.verify_kabupaten' },
};

const STATUS_CONFIG = {
  under_verification_kecamatan: { label: 'Menunggu Verifikasi Kecamatan', color: 'bg-amber-100 text-amber-700' },
  under_validation_instansi: { label: 'Menunggu Validasi Instansi', color: 'bg-purple-100 text-purple-700' },
  under_review_kabupaten: { label: 'Menunggu Review Kabupaten', color: 'bg-violet-100 text-violet-700' },
};

function SikesraVerificationInbox() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { tenantId } = useTenant();
  
  const [queue, setQueue] = useState({ kecamatan: [], instansi: [], kabupaten: [] });
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState('kecamatan');
  
  const canVerifyKecamatan = hasPermission('tenant.sikesra_verification.verify_kecamatan');
  const canValidateInstansi = hasPermission('tenant.sikesra_verification.validate_instansi');
  const canVerifyKabupaten = hasPermission('tenant.sikesra_verification.verify_kabupaten');
  
  useEffect(() => {
    if (tenantId) {
      fetchQueue();
    }
  }, [tenantId]);
  
  const fetchQueue = async () => {
    setLoading(true);
    
    const { data: kecamatanData } = await supabase
      .from('sikesra_entities')
      .select(`id, name, status, created_at, entity_type:sikesra_entity_types(id, name), village:administrative_regions!sikesra_entities_village_id_fkey(name)`)
      .eq('tenant_id', tenantId)
      .eq('status', 'under_verification_kecamatan')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    
    const { data: instansiData } = await supabase
      .from('sikesra_entities')
      .select(`id, name, status, created_at, entity_type:sikesra_entity_types(id, name), village:administrative_regions!sikesra_entities_village_id_fkey(name)`)
      .eq('tenant_id', tenantId)
      .eq('status', 'under_validation_instansi')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    
    const { data: kabupatenData } = await supabase
      .from('sikesra_entities')
      .select(`id, name, status, created_at, entity_type:sikesra_entity_types(id, name), village:administrative_regions!sikesra_entities_village_id_fkey(name)`)
      .eq('tenant_id', tenantId)
      .eq('status', 'under_review_kabupaten')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    
    setQueue({
      kecamatan: kecamatanData || [],
      instansi: instansiData || [],
      kabupaten: kabupatenData || [],
    });
    
    setLoading(false);
  };
  
  const handleVerify = async (entityId, decision, notes) => {
    const level = activeLevel;
    let newStatus;
    
    if (decision === 'verified') {
      if (level === 'kecamatan') {
        newStatus = 'verified_kecamatan';
      } else if (level === 'instansi') {
        newStatus = 'validated_instansi';
      } else {
        newStatus = 'approved_kabupaten';
      }
    } else {
      if (level === 'kecamatan') {
        newStatus = 'revision_requested_kecamatan';
      } else {
        newStatus = 'revision_requested_kabupaten';
      }
    }
    
    const { error: entityError } = await supabase
      .from('sikesra_entities')
      .update({ 
        status: newStatus,
        [`verified_${level}_at`]: new Date().toISOString(),
        [`verified_${level}_by`]: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', entityId);
    
    if (entityError) {
      toast({ variant: 'destructive', title: 'Error', description: entityError.message });
      return;
    }
    
    await supabase.from('sikesra_verifications').insert({
      tenant_id: tenantId,
      entity_id: entityId,
      verification_level: level,
      decision: decision === 'verified' ? 'verified' : 'revision_requested',
      notes: notes,
      verified_by: (await supabase.auth.getUser()).data.user?.id,
    });
    
    toast({ title: 'Berhasil', description: `Entitas berhasil ${decision === 'verified' ? 'diverifikasi' : 'diminta revisi'}` });
    fetchQueue();
  };
  
  const tabs = [
    { key: 'kecamatan', label: 'Kecamatan', count: queue.kecamatan.length, canAccess: canVerifyKecamatan },
    { key: 'instansi', label: 'Instansi', count: queue.instansi.length, canAccess: canValidateInstansi },
    { key: 'kabupaten', label: 'Kabupaten', count: queue.kabupaten.length, canAccess: canVerifyKabupaten },
  ].filter(t => t.canAccess);
  
  const currentQueue = queue[activeLevel] || [];
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            {t('sikesra.verification_inbox', 'Kotak Verifikasi')}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="flex gap-2 mb-4">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                variant={activeLevel === tab.key ? 'default' : 'outline'}
                onClick={() => setActiveLevel(tab.key)}
                className="relative"
              >
                {tab.label}
                {tab.count > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : currentQueue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              {t('sikesra.no_pending', 'Tidak ada antrian verifikasi')}
            </div>
          ) : (
            <div className="space-y-3">
              {currentQueue.map(entity => (
                <div key={entity.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
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
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/cmspanel/sikesra/entities/${entity.id}`)}>
                        Lihat Detail
                      </Button>
                      <Button size="sm" onClick={() => navigate(`/cmspanel/sikesra/entities/${entity.id}/verify`)}>
                        Verifikasi
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

export default SikesraVerificationInbox;
