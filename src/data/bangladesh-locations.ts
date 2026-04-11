export interface LocationNode {
  id: string;
  nameEn: string;
  nameBn: string;
  type: 'division' | 'district' | 'upazila' | 'area';
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
}

export const divisions: LocationNode[] = [
  { id: '1', nameEn: 'Dhaka', nameBn: 'ঢাকা', type: 'division' },
  { id: '2', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', type: 'division' },
  { id: '3', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', type: 'division' },
  { id: '4', nameEn: 'Khulna', nameBn: 'খুলনা', type: 'division' },
  { id: '5', nameEn: 'Barishal', nameBn: 'বরিশাল', type: 'division' },
  { id: '6', nameEn: 'Sylhet', nameBn: 'সিলেট', type: 'division' },
  { id: '7', nameEn: 'Rangpur', nameBn: 'রংপুর', type: 'division' },
  { id: '8', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', type: 'division' },
];

export const districts: LocationNode[] = [
  // Dhaka Division
  { id: '101', nameEn: 'Dhaka', nameBn: 'ঢাকা', type: 'district', divisionId: '1' },
  { id: '102', nameEn: 'Gazipur', nameBn: 'গাজীপুর', type: 'district', divisionId: '1' },
  { id: '103', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ', type: 'district', divisionId: '1' },
  { id: '104', nameEn: 'Manikganj', nameBn: 'মানিকগঞ্জ', type: 'district', divisionId: '1' },
  { id: '105', nameEn: 'Munshiganj', nameBn: 'মুন্সীগঞ্জ', type: 'district', divisionId: '1' },
  { id: '106', nameEn: 'Narsingdi', nameBn: 'নরসিংদী', type: 'district', divisionId: '1' },
  { id: '107', nameEn: 'Tangail', nameBn: 'টাঙ্গাইল', type: 'district', divisionId: '1' },
  { id: '108', nameEn: 'Faridpur', nameBn: 'ফরিদপুর', type: 'district', divisionId: '1' },
  { id: '109', nameEn: 'Gopalganj', nameBn: 'গোপালগঞ্জ', type: 'district', divisionId: '1' },
  { id: '110', nameEn: 'Madaripur', nameBn: 'মাদারীপুর', type: 'district', divisionId: '1' },
  { id: '111', nameEn: 'Rajbari', nameBn: 'রাজবাড়ী', type: 'district', divisionId: '1' },
  { id: '112', nameEn: 'Shariatpur', nameBn: 'শরীয়তপুর', type: 'district', divisionId: '1' },
  { id: '113', nameEn: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ', type: 'district', divisionId: '1' },

  // Chattogram Division
  { id: '201', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', type: 'district', divisionId: '2' },
  { id: '202', nameEn: 'Cox\'s Bazar', nameBn: 'কক্সবাজার', type: 'district', divisionId: '2' },
  { id: '203', nameEn: 'Cumilla', nameBn: 'কুমিল্লা', type: 'district', divisionId: '2' },
  { id: '204', nameEn: 'Feni', nameBn: 'ফেনী', type: 'district', divisionId: '2' },
  { id: '205', nameEn: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া', type: 'district', divisionId: '2' },
  { id: '206', nameEn: 'Noakhali', nameBn: 'নোয়াখালী', type: 'district', divisionId: '2' },
  { id: '207', nameEn: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর', type: 'district', divisionId: '2' },
  { id: '208', nameEn: 'Chandpur', nameBn: 'চাঁদপুর', type: 'district', divisionId: '2' },
  { id: '209', nameEn: 'Khagrachhari', nameBn: 'খাগড়াছড়ি', type: 'district', divisionId: '2' },
  { id: '210', nameEn: 'Rangamati', nameBn: 'রাঙ্গামাটি', type: 'district', divisionId: '2' },
  { id: '211', nameEn: 'Bandarban', nameBn: 'বান্দরবান', type: 'district', divisionId: '2' },

  // Rajshahi Division
  { id: '301', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', type: 'district', divisionId: '3' },
  { id: '302', nameEn: 'Bogura', nameBn: 'বগুড়া', type: 'district', divisionId: '3' },
  { id: '303', nameEn: 'Pabna', nameBn: 'পাবনা', type: 'district', divisionId: '3' },
  { id: '304', nameEn: 'Sirajganj', nameBn: 'সিরাজগঞ্জ', type: 'district', divisionId: '3' },
  { id: '305', nameEn: 'Naogaon', nameBn: 'নওগাঁ', type: 'district', divisionId: '3' },
  { id: '306', nameEn: 'Natore', nameBn: 'নাটোর', type: 'district', divisionId: '3' },
  { id: '307', nameEn: 'Joypurhat', nameBn: 'জয়পুরহাট', type: 'district', divisionId: '3' },
  { id: '308', nameEn: 'Chapai Nawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ', type: 'district', divisionId: '3' },

  // Khulna Division
  { id: '401', nameEn: 'Khulna', nameBn: 'খুলনা', type: 'district', divisionId: '4' },
  { id: '402', nameEn: 'Jashore', nameBn: 'যশোর', type: 'district', divisionId: '4' },
  { id: '403', nameEn: 'Satkhira', nameBn: 'সাতক্ষীরা', type: 'district', divisionId: '4' },
  { id: '404', nameEn: 'Bagerhat', nameBn: 'বাগেরহাট', type: 'district', divisionId: '4' },
  { id: '405', nameEn: 'Kushtia', nameBn: 'কুষ্টিয়া', type: 'district', divisionId: '4' },
  { id: '406', nameEn: 'Magura', nameBn: 'মাগুরা', type: 'district', divisionId: '4' },
  { id: '407', nameEn: 'Meherpur', nameBn: 'মেহেরপুর', type: 'district', divisionId: '4' },
  { id: '408', nameEn: 'Narail', nameBn: 'নড়াইল', type: 'district', divisionId: '4' },
  { id: '409', nameEn: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা', type: 'district', divisionId: '4' },
  { id: '410', nameEn: 'Jhenaidah', nameBn: 'ঝিনাইদহ', type: 'district', divisionId: '4' },

  // Barishal Division
  { id: '501', nameEn: 'Barishal', nameBn: 'বরিশাল', type: 'district', divisionId: '5' },
  { id: '502', nameEn: 'Bhola', nameBn: 'ভোলা', type: 'district', divisionId: '5' },
  { id: '503', nameEn: 'Patuakhali', nameBn: 'পটুয়াখালী', type: 'district', divisionId: '5' },
  { id: '504', nameEn: 'Pirojpur', nameBn: 'পিরোজপুর', type: 'district', divisionId: '5' },
  { id: '505', nameEn: 'Jhalokathi', nameBn: 'ঝালকাঠি', type: 'district', divisionId: '5' },
  { id: '506', nameEn: 'Barguna', nameBn: 'বরগুনা', type: 'district', divisionId: '5' },

  // Sylhet Division
  { id: '601', nameEn: 'Sylhet', nameBn: 'সিলেট', type: 'district', divisionId: '6' },
  { id: '602', nameEn: 'Moulvibazar', nameBn: 'মৌলভীবাজার', type: 'district', divisionId: '6' },
  { id: '603', nameEn: 'Habiganj', nameBn: 'হবিগঞ্জ', type: 'district', divisionId: '6' },
  { id: '604', nameEn: 'Sunamganj', nameBn: 'সুনামগঞ্জ', type: 'district', divisionId: '6' },

  // Rangpur Division
  { id: '701', nameEn: 'Rangpur', nameBn: 'রংপুর', type: 'district', divisionId: '7' },
  { id: '702', nameEn: 'Dinajpur', nameBn: 'দিনাজপুর', type: 'district', divisionId: '7' },
  { id: '703', nameEn: 'Kurigram', nameBn: 'কুড়িগ্রাম', type: 'district', divisionId: '7' },
  { id: '704', nameEn: 'Gaibandha', nameBn: 'গাইবান্ধা', type: 'district', divisionId: '7' },
  { id: '705', nameEn: 'Lalmonirhat', nameBn: 'লালমনিরহাট', type: 'district', divisionId: '7' },
  { id: '706', nameEn: 'Nilphamari', nameBn: 'নীলফামারী', type: 'district', divisionId: '7' },
  { id: '707', nameEn: 'Panchagarh', nameBn: 'পঞ্চগড়', type: 'district', divisionId: '7' },
  { id: '708', nameEn: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও', type: 'district', divisionId: '7' },

  // Mymensingh Division
  { id: '801', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', type: 'district', divisionId: '8' },
  { id: '802', nameEn: 'Jamalpur', nameBn: 'জামালপুর', type: 'district', divisionId: '8' },
  { id: '803', nameEn: 'Netrokona', nameBn: 'নেত্রকোণা', type: 'district', divisionId: '8' },
  { id: '804', nameEn: 'Sherpur', nameBn: 'শেরপুর', type: 'district', divisionId: '8' },
];

export const upazilas: LocationNode[] = [
  // Major Upazilas/Thanas for Dhaka
  { id: '10101', nameEn: 'Dhanmondi', nameBn: 'ধানমন্ডি', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10102', nameEn: 'Gulshan', nameBn: 'গুলশান', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10103', nameEn: 'Mirpur', nameBn: 'মিরপুর', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10104', nameEn: 'Uttara', nameBn: 'উত্তরা', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10105', nameEn: 'Mohammadpur', nameBn: 'মোহাম্মদপুর', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10106', nameEn: 'Banani', nameBn: 'বনানী', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10107', nameEn: 'Motijheel', nameBn: 'মতিঝিল', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10108', nameEn: 'Tejgaon', nameBn: 'তেজগাঁও', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10109', nameEn: 'Savar', nameBn: 'সাভার', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10110', nameEn: 'Keraniganj', nameBn: 'কেরানীগঞ্জ', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10111', nameEn: 'Dhamrai', nameBn: 'ধামরাই', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10112', nameEn: 'Dohar', nameBn: 'দোহার', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10113', nameEn: 'Nawabganj', nameBn: 'নবাবগঞ্জ', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10114', nameEn: 'Badda', nameBn: 'বাড্ডা', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10115', nameEn: 'Cantonment', nameBn: 'ক্যান্টনমেন্ট', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10116', nameEn: 'Demra', nameBn: 'ডেমরা', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10117', nameEn: 'Hazaribagh', nameBn: 'হাজারীবাগ', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10118', nameEn: 'Kafrul', nameBn: 'কাফরুল', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10119', nameEn: 'Kamrangirchar', nameBn: 'কামরাঙ্গীরচর', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10120', nameEn: 'Khilgaon', nameBn: 'খিলগাঁও', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10121', nameEn: 'Kotwali', nameBn: 'কোতোয়ালী', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10122', nameEn: 'Lalbagh', nameBn: 'লালবাগ', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10123', nameEn: 'Pallabi', nameBn: 'পল্লবী', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10124', nameEn: 'Paltan', nameBn: 'পল্টন', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10125', nameEn: 'Ramna', nameBn: 'রমনা', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10126', nameEn: 'Sabujbagh', nameBn: 'সবুজবাগ', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10127', nameEn: 'Sutrapur', nameBn: 'সূত্রাপুর', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10128', nameEn: 'Tejgaon Industrial Area', nameBn: 'তেজগাঁও শিল্পাঞ্চল', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10129', nameEn: 'Turag', nameBn: 'তুরাগ', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10130', nameEn: 'Uttar Khan', nameBn: 'উত্তর খান', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10131', nameEn: 'Dakshinkhan', nameBn: 'দক্ষিণখান', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10132', nameEn: 'Vatara', nameBn: 'ভাটারা', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10133', nameEn: 'Shahbagh', nameBn: 'শাহবাগ', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10134', nameEn: 'Sher-e-Bangla Nagar', nameBn: 'শেরেবাংলা নগর', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10135', nameEn: 'Khilkhet', nameBn: 'খিলক্ষেত', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10136', nameEn: 'Rampura', nameBn: 'রামপুরা', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10137', nameEn: 'Kadamtali', nameBn: 'কদমতলী', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10138', nameEn: 'Shyampur', nameBn: 'শ্যামপুর', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10139', nameEn: 'New Market', nameBn: 'নিউ মার্কেট', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10140', nameEn: 'Adabor', nameBn: 'আদাবর', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10141', nameEn: 'Darussalam', nameBn: 'দারুসসালাম', type: 'upazila', districtId: '101', divisionId: '1' },
  { id: '10142', nameEn: 'Shah Ali', nameBn: 'শাহ আলী', type: 'upazila', districtId: '101', divisionId: '1' },

  // Chattogram Major
  { id: '20101', nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20102', nameEn: 'Double Mooring', nameBn: 'ডবলমুরিং', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20103', nameEn: 'Kotwali', nameBn: 'কোতোয়ালী', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20104', nameEn: 'Pahartali', nameBn: 'পাহাড়তলী', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20105', nameEn: 'Bandar', nameBn: 'বন্দর', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20106', nameEn: 'Chandgaon', nameBn: 'চান্দগাঁও', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20107', nameEn: 'Bakalia', nameBn: 'বাকলিয়া', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20108', nameEn: 'Patenga', nameBn: 'পতেঙ্গা', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20109', nameEn: 'Bayazid', nameBn: 'বায়েজিদ', type: 'upazila', districtId: '201', divisionId: '2' },
  { id: '20110', nameEn: 'Halishahar', nameBn: 'হালিশহর', type: 'upazila', districtId: '201', divisionId: '2' },

  // Add more as needed, but this covers major urban areas for now.
];

export const allLocations: LocationNode[] = [
  ...divisions,
  ...districts,
  ...upazilas
];
