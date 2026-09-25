import React, { useState, useEffect } from 'react';
import { Contact, Organisation } from '../../types';
import { StorageService } from '../../services/storageService';
import { X, Building2, User, Mail, Phone, MapPin, Hash, Briefcase, Check } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  initialOrg?: Organisation | null;
  onSaved: (savedOrg: Organisation) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  companyId,
  initialOrg,
  onSaved,
}) => {
  const isEditing = Boolean(initialOrg);

  // Organisation fields
  const [name, setName] = useState('');
  const [tpin, setTpin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Zambia');

  // Primary contact person fields
  const [hasContactPerson, setHasContactPerson] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrg) {
      setName(initialOrg.name || '');
      setTpin(initialOrg.tpin || '');
      setEmail(initialOrg.email || '');
      setPhone(initialOrg.phone || '');
      setAddressLine1(initialOrg.address_line1 || '');
      setAddressLine2(initialOrg.address_line2 || '');
      setCity(initialOrg.city || '');
      setCountry(initialOrg.country || 'Zambia');

      // Fetch primary contact if exists
      const contacts = StorageService.getContacts(initialOrg.id);
      const primary = contacts.find((c) => c.is_primary) || contacts[0];
      if (primary) {
        setHasContactPerson(true);
        setContactId(primary.id);
        setFirstName(primary.first_name || '');
        setLastName(primary.last_name || '');
        setContactEmail(primary.email || '');
        setContactPhone(primary.phone || '');
        setJobTitle(primary.job_title || '');
      } else {
        setHasContactPerson(false);
        setContactId(null);
        setFirstName('');
        setLastName('');
        setContactEmail('');
        setContactPhone('');
        setJobTitle('');
      }
    } else {
      // Reset for new client
      setName('');
      setTpin('');
      setEmail('');
      setPhone('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setCountry('Zambia');
      setHasContactPerson(false);
      setContactId(null);
      setFirstName('');
      setLastName('');
      setContactEmail('');
      setContactPhone('');
      setJobTitle('');
    }
    setError(null);
  }, [initialOrg, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client / Organisation name is required.');
      return;
    }

    const now = new Date().toISOString();
    const orgId = initialOrg ? initialOrg.id : `org_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

    const savedOrg: Organisation = {
      id: orgId,
      company_id: companyId,
      name: name.trim(),
      tpin: tpin.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address_line1: addressLine1.trim() || undefined,
      address_line2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      is_active: true,
      created_at: initialOrg ? initialOrg.created_at : now,
      updated_at: now,
    };

    StorageService.saveOrganisation(savedOrg);

    // Save contact person if filled
    if (hasContactPerson && (firstName.trim() || lastName.trim() || contactEmail.trim())) {
      const cId = contactId || `cont_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      const savedContact: Contact = {
        id: cId,
        company_id: companyId,
        organisation_id: orgId,
        first_name: firstName.trim() || 'Primary',
        last_name: lastName.trim() || 'Contact',
        email: contactEmail.trim() || email.trim() || '',
        phone: contactPhone.trim() || phone.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        is_primary: true,
        is_active: true,
        created_at: initialOrg && contactId ? now : now,
        updated_at: now,
      };
      StorageService.saveContact(savedContact);
    }

    onSaved(savedOrg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {isEditing ? 'Edit Client Details' : 'Capture New Client'}
              </h2>
              <p className="text-xs text-stone-500">
                {isEditing
                  ? `Update contact and billing details for ${initialOrg?.name}`
                  : 'Register a client organization for billing, invoices, and operations'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Organisation Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-stone-900 border-b border-stone-100 pb-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Organisation &amp; Billing Profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">
                  Organisation / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Savannah Agribusiness Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-stone-400" />
                  <span>TPIN / Tax ID Number</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1002938475"
                  value={tpin}
                  onChange={(e) => setTpin(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>Official Email Address</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g., accounts@client.co.zm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g., +260 97 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>City / Town</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Lusaka, Kitwe, Ndola"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Physical Address Line 1</label>
                <input
                  type="text"
                  placeholder="e.g., Plot 1045, Great East Road"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Physical Address Line 2 / Suite</label>
                <input
                  type="text"
                  placeholder="e.g., Suite 4B, 2nd Floor"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">Country</label>
                <input
                  type="text"
                  placeholder="e.g., Zambia"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Primary Contact Person */}
          <div className="space-y-4 pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Primary Contact Person</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-600 hover:text-stone-900">
                <input
                  type="checkbox"
                  checked={hasContactPerson}
                  onChange={(e) => setHasContactPerson(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                />
                <span className="font-medium text-xs">Add / Update key contact</span>
              </label>
            </div>

            {hasContactPerson && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Peter"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Banda"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-stone-400" />
                    <span>Job Title / Role</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Procurement Director, Finance Manager"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <span>Direct Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., p.banda@client.co.zm"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>Direct Phone / Mobile</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +260 96 7654321"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Create Client'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
