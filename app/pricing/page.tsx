import MarketingShell from '@/components/MarketingShell';
import Pricing from '@/components/Pricing';
export const metadata={title:'Pricing | Joinery Studio',description:'Explore Basic, proposed Pro pricing and Enterprise options for Joinery Studio.'};
export default function Page(){return <MarketingShell><main id="main-content" className="siteSection pricingPage"><div className="pricingHero"><p className="eyebrow">SPACE FOR EVERY IDEA</p><h1>Your next project.<br/><em>Your kind of plan.</em></h1><p className="lead">Start with a concept. Find your finish.<br/>Choose the space your ideas need to grow.</p><div className="pricingHeroDetail" aria-hidden="true"><span/>PLAN · REFINE · PRESENT<span/></div></div><Pricing/></main></MarketingShell>}
