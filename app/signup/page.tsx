import MarketingShell from '@/components/MarketingShell';
import AccountLayout from '@/components/AccountLayout';
import EnquiryForm from '@/components/EnquiryForm';
export const metadata={title:'Join the studio.'+' | Joinery Studio'};
export default function Page(){return <MarketingShell><AccountLayout eyebrow='YOUR NEXT IDEA' title='Join the studio.' intro='Accounts are provisioned individually during the initial rollout. Tell us about your company to request access.'><EnquiryForm/></AccountLayout></MarketingShell>}
