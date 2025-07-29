import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface NegotiationOffer {
  id: string;
  offer_type: string;
  offered_by: string;
  amount: number;
  notes: string;
  status: string;
  created_at: string;
  offered_by_user_id: string;
}

interface NegotiationPanelProps {
  jobId: string;
  businessId: string;
  isAdmin: boolean;
  currentUserId: string;
  negotiationStatus: string;
  onNegotiationUpdate: () => void;
}

const NegotiationPanel = ({
  jobId,
  businessId,
  isAdmin,
  currentUserId,
  negotiationStatus,
  onNegotiationUpdate
}: NegotiationPanelProps) => {
  const [offers, setOffers] = useState<NegotiationOffer[]>([]);
  const [newOffer, setNewOffer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOffers();
  }, [jobId]);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('negotiation_offers')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load negotiation history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitOffer = async (action: 'offer' | 'accept' | 'decline') => {
    if (!newOffer && action === 'offer') return;

    setSubmitting(true);
    try {
      let updates: any = {};
      let newNegotiationStatus = negotiationStatus;

      if (action === 'offer') {
        // Create new offer
        const offerType = offers.length === 0 ? 'initial' : 
          (isAdmin ? 'counter_admin' : 'counter_user');
        
        const { error: offerError } = await supabase
          .from('negotiation_offers')
          .insert({
            job_id: jobId,
            business_id: businessId,
            offer_type: offerType,
            offered_by: isAdmin ? 'admin' : 'inspector',
            offered_by_user_id: currentUserId,
            amount: parseFloat(newOffer),
            notes: notes,
            status: 'pending'
          });

        if (offerError) throw offerError;

        // Mark previous offers as superseded
        if (offers.length > 0) {
          await supabase
            .from('negotiation_offers')
            .update({ status: 'superseded' })
            .eq('job_id', jobId)
            .neq('status', 'superseded');
        }

        newNegotiationStatus = isAdmin ? 'pending_user' : 'pending_admin';
        
      } else if (action === 'accept') {
        // Accept the latest offer
        const latestOffer = offers[offers.length - 1];
        await supabase
          .from('negotiation_offers')
          .update({ status: 'accepted' })
          .eq('id', latestOffer.id);

        updates.final_agreed_price = latestOffer.amount;
        newNegotiationStatus = 'agreed';
        
      } else if (action === 'decline') {
        // Decline the latest offer
        const latestOffer = offers[offers.length - 1];
        await supabase
          .from('negotiation_offers')
          .update({ status: 'declined' })
          .eq('id', latestOffer.id);

        newNegotiationStatus = 'declined';
      }

      // Update job status
      const { error: jobError } = await supabase
        .from('inspection_jobs')
        .update({
          negotiation_status: newNegotiationStatus,
          ...updates
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      toast({
        title: "Success",
        description: action === 'offer' ? 'Offer submitted' : 
          action === 'accept' ? 'Offer accepted' : 'Offer declined',
      });

      setNewOffer('');
      setNotes('');
      fetchOffers();
      onNegotiationUpdate();

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process negotiation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agreed':
        return <Badge className="bg-success hover:bg-success/80"><CheckCircle2 className="w-3 h-3 mr-1" />Agreed</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'pending_admin':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Awaiting Admin</Badge>;
      case 'pending_user':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Awaiting User</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const canMakeOffer = () => {
    if (negotiationStatus === 'agreed' || negotiationStatus === 'declined') return false;
    if (negotiationStatus === 'not_started') return !isAdmin; // Only inspector can start
    if (negotiationStatus === 'pending_admin') return isAdmin;
    if (negotiationStatus === 'pending_user') return !isAdmin;
    return false;
  };

  const canRespondToOffer = () => {
    if (offers.length === 0) return false;
    if (negotiationStatus === 'agreed' || negotiationStatus === 'declined') return false;
    const latestOffer = offers[offers.length - 1];
    return latestOffer.offered_by !== (isAdmin ? 'admin' : 'inspector');
  };

  if (loading) {
    return (
      <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center">Loading negotiation...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Price Negotiation
          </CardTitle>
          {getStatusBadge(negotiationStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Offer History */}
        {offers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Negotiation History</h4>
            <div className="space-y-2">
              {offers.map((offer, index) => (
                <div
                  key={offer.id}
                  className={`p-3 rounded-lg border ${
                    offer.status === 'accepted' ? 'bg-success/10 border-success/20' :
                    offer.status === 'declined' ? 'bg-destructive/10 border-destructive/20' :
                    offer.status === 'superseded' ? 'bg-muted/50 opacity-60' :
                    'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {offer.offered_by === 'admin' ? 'Admin' : 'Inspector'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        £{offer.amount.toLocaleString()}
                      </Badge>
                      {index < offers.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(offer.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  {offer.notes && (
                    <p className="text-xs text-muted-foreground">{offer.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response to Latest Offer */}
        {canRespondToOffer() && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium">
              Respond to £{offers[offers.length - 1]?.amount.toLocaleString()} offer
            </h4>
            <div className="flex gap-2">
              <Button
                onClick={() => submitOffer('accept')}
                disabled={submitting}
                className="flex-1 bg-success hover:bg-success/80"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                variant="outline"
                onClick={() => submitOffer('decline')}
                disabled={submitting}
                className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Make New Offer */}
        {canMakeOffer() && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {offers.length === 0 ? 'Submit Initial Offer' : 'Make Counter Offer'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount (£)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={newOffer}
                  onChange={(e) => setNewOffer(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes (Optional)</label>
                <Textarea
                  placeholder="Add any notes about your offer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-16"
                />
              </div>
              <Button
                onClick={() => submitOffer('offer')}
                disabled={submitting || !newOffer}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Submit Offer
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {negotiationStatus === 'agreed' && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm text-success font-medium">
              ✅ Price agreed! Final amount: £{offers.find(o => o.status === 'accepted')?.amount.toLocaleString()}
            </p>
          </div>
        )}

        {negotiationStatus === 'declined' && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              ❌ Negotiation ended - offer was declined
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NegotiationPanel;