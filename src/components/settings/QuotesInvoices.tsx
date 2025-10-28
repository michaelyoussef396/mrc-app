import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const QuotesInvoices = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Quote and invoice settings updated successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Quotes & Invoices</CardTitle>
        </div>
        <CardDescription>
          Configure numbering, payment details and terms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Quote Number Format</Label>
          <div className="space-y-2">
            <Label htmlFor="quote-format">Format</Label>
            <Input id="quote-format" defaultValue="MRC-YYYY-####" />
            <p className="text-sm text-muted-foreground">
              Examples: MRC-2025-0001, MRC-2025-0042
            </p>
            <p className="text-sm font-medium">
              Next number: <span className="text-primary">MRC-2025-0043</span>
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Invoice Number Format</Label>
          <div className="space-y-2">
            <Label htmlFor="invoice-format">Format</Label>
            <Input id="invoice-format" defaultValue="INV-YYYY-####" />
            <p className="text-sm text-muted-foreground">
              Examples: INV-2025-0001
            </p>
            <p className="text-sm font-medium">
              Next number: <span className="text-primary">INV-2025-0001</span>
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Payment Details</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank">Bank</Label>
              <Input id="bank" defaultValue="ANZ Bank" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bsb">BSB</Label>
              <Input id="bsb" defaultValue="123-456" placeholder="XXX-XXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">Account Number</Label>
              <Input id="account" defaultValue="12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input id="account-name" defaultValue="Mould & Restoration Co." />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Payment Methods Accepted</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="bank-transfer">Bank Transfer</Label>
              <Switch defaultChecked id="bank-transfer" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="credit-card">Credit Card (Stripe)</Label>
              <Switch defaultChecked id="credit-card" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cash">Cash</Label>
              <Switch defaultChecked id="cash" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cheque">Cheque</Label>
              <Switch defaultChecked id="cheque" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Payment Terms</Label>
          <RadioGroup defaultValue="14">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="7" id="7days" />
              <Label htmlFor="7days" className="cursor-pointer">Due within 7 days</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="14" id="14days" />
              <Label htmlFor="14days" className="cursor-pointer">Due within 14 days</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="30" id="30days" />
              <Label htmlFor="30days" className="cursor-pointer">Due within 30 days</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="completion" id="completion" />
              <Label htmlFor="completion" className="cursor-pointer">Due on completion</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Terms & Conditions</Label>
          <Textarea
            defaultValue={`1. Payment is due within 14 days of completion
2. Warranty covers workmanship for 12 months
3. Client responsible for contents protection
4. Additional work requires written approval
5. Cancellation fees may apply`}
            rows={8}
            className="font-mono text-sm"
          />
          <Button variant="outline" size="sm">Edit Terms & Conditions</Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Quote Disclaimer</Label>
          <Textarea
            defaultValue="This quote is valid for 30 days. Final costs may vary based on site conditions discovered during work."
            rows={3}
          />
        </div>

        <div className="pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuotesInvoices;
