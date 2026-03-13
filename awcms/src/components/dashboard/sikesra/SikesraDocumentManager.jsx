import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { usePermissions } from '@/contexts/PermissionContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Upload, CheckCircle, XCircle, AlertCircle, ArrowRightCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const DOCUMENT_CONFIG = {
  ktp: { label: 'KTP', color: 'bg-blue-100 text-blue-700' },
  skt: { label: 'SKT', color: 'bg-green-100 text-green-700' },
  foto_lokasi: { label: 'Foto Lokasi', color: 'bg-purple-100 text-purple-700' },
  surat_keterangan: { label: 'Surat Keterangan', color: 'bg-orange-100 text-orange-700' },
  surat_domisili: { label: 'Surat Domisili', color: 'bg-pink-100 text-pink-700' },
  sk_ortu: { label: 'SK Ortu', color: 'bg-cyan-100 text-cyan-700' },
  other: { label: 'Lainnya', color: 'bg-slate-100 text-slate-700' },
};

const DOCUMENT_STATUS_CONFIG = {
  uploaded: { label: 'Diupload', color: 'bg-blue-100 text-blue-700', icon: Upload },
  under_review: { label: 'Sedang Review', color: 'bg-amber-100 text-amber-700', icon: FileText },
  verified: { label: 'Terverifikasi', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  superseded: { label: 'Digantikan', color: 'bg-gray-100 text-gray-700', icon: ArrowRightCircle },
};

function SikesraDocumentManager({ showTrash = false }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { tenantId } = useTenant();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const canCreate = hasPermission('tenant.sikesra_document.create');
  const canUpdate = hasPermission('tenant.sikesra_document.update');
  const canDelete = hasPermission('tenant.sikesra_document.delete');
  
  useEffect(() => {
    if (tenantId) {
      fetchDocuments();
    }
  }, [tenantId, filterType, filterStatus, showTrash]);
  
  const fetchDocuments = async () => {
    setLoading(true);
    
    let queryBuilder = supabase
      .from('sikesra_documents')
      .select(`
        id,
        original_filename,
        document_type,
        status,
        created_at,
        entity:sikesra_entities(id, name)
      `)
      .eq('tenant_id', tenantId);
    
    if (showTrash) {
      queryBuilder = queryBuilder.not.is('deleted_at', null);
    } else {
      queryBuilder = queryBuilder.is('deleted_at', null);
    }
    
    if (filterType !== 'all') {
      queryBuilder = queryBuilder.eq('document_type', filterType);
    }
    
    if (filterStatus !== 'all') {
      queryBuilder = queryBuilder.eq('status', filterStatus);
    }
    
    const { data, error } = await queryBuilder.order('created_at', { ascending: false });
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setDocuments(data || []);
    }
    
    setLoading(false);
  };
  
  const StatusBadge = ({ status }) => {
    const config = DOCUMENT_STATUS_CONFIG[status] || DOCUMENT_STATUS_CONFIG.uploaded;
    const Icon = config.icon;
    
    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };
  
  const TypeBadge = ({ type }) => {
    const config = DOCUMENT_CONFIG[type] || DOCUMENT_CONFIG.other;
    return <Badge className={config.color}>{config.label}</Badge>;
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('sikesra.documents', 'Dokumen')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Jenis Dokumen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Object.entries(DOCUMENT_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Object.entries(DOCUMENT_STATUS_CONFIG).map(([key, config]) => (
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
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showTrash ? 'Tidak ada dokumen di sampah' : 'Tidak ada dokumen'}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-purple-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">{doc.original_filename}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <TypeBadge type={doc.document_type} />
                        {doc.entity?.name && <span>• {doc.entity.name}</span>}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SikesraDocumentManager;
