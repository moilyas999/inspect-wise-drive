import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useBusinessData, Inspector } from '@/hooks/useBusinessData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateInspectionJobModalProps {
  onJobCreated: () => void;
  children: React.ReactNode;
}

const CreateInspectionJobModal = ({ onJobCreated, children }: CreateInspectionJobModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { businessId, getStaffMembers } = useBusinessData();
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [registration, setRegistration] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [mileage, setMileage] = useState('');
  const [color, setColor] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [deadline, setDeadline] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow

  const resetForm = () => {
    setRegistration('');
    setMake('');
    setModel('');
    setVin('');
    setYear(new Date().getFullYear());
    setMileage('');
    setColor('');
    setFuelType('');
    setTransmission('');
    setPurchaseDate(new Date());
    setPriority('medium');
    setNotes('');
    setSellerAddress('');
    setDeadline(new Date(Date.now() + 24 * 60 * 60 * 1000));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registration.trim() || !make.trim() || !model.trim() || !businessId || !user) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user's inspector ID
      const { data: inspectorData, error: inspectorError } = await supabase
        .from('inspectors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (inspectorError || !inspectorData) {
        throw new Error('Unable to find inspector profile');
      }
      const { data, error } = await supabase
        .from('inspection_jobs')
        .insert({
          reg: registration.trim().toUpperCase(),
          make: make.trim(),
          model: model.trim(),
          vin: vin.trim() || null,
          year: year,
          mileage: mileage ? parseInt(mileage) : null,
          color: color.trim() || null,
          fuel_type: fuelType || null,
          transmission: transmission || null,
          purchase_date: purchaseDate.toISOString().split('T')[0],
          purchase_price: null,
          priority: priority,
          notes: notes.trim() || null,
          seller_address: sellerAddress.trim() || null,
          assigned_to: inspectorData.id,
          deadline: deadline.toISOString(),
          status: 'not_started',
          business_id: businessId
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Inspection Job Created",
        description: `New inspection job for ${registration.toUpperCase()} has been created and assigned.`,
      });

      resetForm();
      setOpen(false);
      onJobCreated();
    } catch (error: any) {
      console.error('Error creating inspection job:', error);
      toast({
        title: "Error Creating Job",
        description: error.message || "Failed to create inspection job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Inspection Job
          </DialogTitle>
          <DialogDescription>
            Add a new vehicle inspection job for a vehicle purchase. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration" className="text-sm font-medium">Registration Number *</Label>
              <Input
                id="registration"
                placeholder="e.g. AB21 XYZ"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                required
                disabled={loading}
                className="uppercase h-12 rounded-xl border-2 focus:border-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vin" className="text-sm font-medium">VIN (Optional)</Label>
              <Input
                id="vin"
                placeholder="Vehicle Identification Number"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                disabled={loading}
                className="h-12 rounded-xl border-2 focus:border-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make" className="text-sm font-medium">Make *</Label>
              <Input
                id="make"
                placeholder="e.g. BMW, Audi, Ford"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-xl border-2 focus:border-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium">Model *</Label>
              <Input
                id="model"
                placeholder="e.g. 320d M Sport, A4 Avant"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-xl border-2 focus:border-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Purchase Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 rounded-xl border-2 focus:border-primary/30",
                      !purchaseDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl bg-popover/95 backdrop-blur-sm border-2" align="start">
                  <Calendar
                    mode="single"
                    selected={purchaseDate}
                    onSelect={(date) => date && setPurchaseDate(date)}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Inspection Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 rounded-xl border-2 focus:border-primary/30",
                      !deadline && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Select deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl bg-popover/95 backdrop-blur-sm border-2" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(date) => date && setDeadline(date)}
                    initialFocus
                    className="p-3"
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Vehicle Details Section */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="2024"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                disabled={loading}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="h-12 rounded-xl border-2 focus:border-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mileage" className="text-sm font-medium">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                placeholder="50000"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                disabled={loading}
                min="0"
                className="h-12 rounded-xl border-2 focus:border-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color" className="text-sm font-medium">Color</Label>
              <Input
                id="color"
                placeholder="e.g. Black, White, Blue"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={loading}
                className="h-12 rounded-xl border-2 focus:border-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelType" className="text-sm font-medium">Fuel Type</Label>
              <Select value={fuelType} onValueChange={setFuelType} disabled={loading}>
                <SelectTrigger className="h-12 rounded-xl border-2 focus:border-primary/30">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover/95 backdrop-blur-sm border-2">
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transmission" className="text-sm font-medium">Transmission</Label>
              <Select value={transmission} onValueChange={setTransmission} disabled={loading}>
                <SelectTrigger className="h-12 rounded-xl border-2 focus:border-primary/30">
                  <SelectValue placeholder="Select transmission" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover/95 backdrop-blur-sm border-2">
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="cvt">CVT</SelectItem>
                  <SelectItem value="semi-automatic">Semi-Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={loading}>
              <SelectTrigger className="h-12 rounded-xl border-2 focus:border-primary/30">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover/95 backdrop-blur-sm border-2">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about the vehicle or inspection requirements"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              className="rounded-xl border-2 focus:border-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellerAddress" className="text-sm font-medium">Seller Address (Optional)</Label>
            <Textarea
              id="sellerAddress"
              placeholder="Address where the vehicle is located or seller's address"
              value={sellerAddress}
              onChange={(e) => setSellerAddress(e.target.value)}
              disabled={loading}
              rows={3}
              className="rounded-xl border-2 focus:border-primary/30"
            />
          </div>

          <div className="bg-accent/20 p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This inspection job will be automatically assigned to you and you can start the inspection process immediately.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 gap-2 h-12 rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Job
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInspectionJobModal;