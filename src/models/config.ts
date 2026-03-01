export type Battery = {
  capacity_mAh: number;
  nominal_V: number;
  usable_fraction: number;
};

export type Storage = {
  flash_bytes_available: number;
};

export type Lis2dw12Mode = "LP1" | "LP2" | "LP3" | "LP4" | "HP";
export type Lis2dw12Noise = "low_noise_off" | "low_noise_on";
export type Lis2dw12Fs = 2 | 4 | 8 | 16;

export type Lis2dw12Config = {
  odr_hz: number;
  mode: Lis2dw12Mode;
  noise: Lis2dw12Noise;
  fs_g: Lis2dw12Fs;
  fifo_watermark: number;
  fifo_mode: "continuous" | "fifo" | "bypass";
  override_current_uA?: number;
};

export type Nrf52PowerModel = {
  sleep_current_uA: number;
  active_current_mA: number;
  fifo_service_time_ms: number;
  finalize_time_ms: number;
};

export type FlashModel = {
  enabled: boolean;
  write_current_mA: number;
  write_time_ms: number;
  erase_current_mA: number;
  erase_time_ms: number;
  erase_interval_records: number;
};

export type ReportConfig = {
  interval_seconds: number;
  store_to_flash: boolean;
};

export type StatField =
  | "timestamp_u32"
  | "odba_mean_i16"
  | "odba_max_i16"
  | "vedba_mean_i16"
  | "vedba_max_i16"
  | "std_xyz_i16x3"
  | "mean_xyz_i16x3"
  | "peak_acc_i16"
  | "sample_count_u16"
  | "activity_flags_u8"
  | "reserved_u8"
  | "odr_code_u8"
  | "fs_code_u8"
  | "mode_code_u8"
  | "overflow_count_u8"
  | "crc16_u16"
  | "window_len_s_u16"
  | "temp_cC_i16"
  | "batt_mV_u16";

export type PayloadConfig = {
  included_fields: StatField[];
  scaling: {
    accel_unit: "mg";
    odba_unit: "mg";
    vedba_unit: "mg";
    std_unit: "mg";
    peak_unit: "mg";
  };
  odba_definition: "abs_sum_dynamic" | "abs_sum_raw";
  vedba_definition: "rss_dynamic" | "rss_raw" | "rss2_dynamic";
  gravity_removal: "iir_lp" | "window_mean";
  iir_alpha: number;
  mean_std_frame: "dynamic" | "raw";
  activity_thresholds: {
    odba_mean_mg: number;
    stillness_std_mg: number;
  };
};

export type RuntimeUncertainty = {
  enabled: boolean;
  best_case_factor: number;
  typical_factor: number;
  worst_case_factor: number;
};

export type AppConfig = {
  battery: Battery;
  storage: Storage;
  lis: Lis2dw12Config;
  nrf52: Nrf52PowerModel;
  flash: FlashModel;
  report: ReportConfig;
  payload: PayloadConfig;
  max_payload_bytes?: number;
  uncertainty: RuntimeUncertainty;
};

export type BatteryPreset = {
  id: string;
  label: string;
  capacity_mAh: number;
  nominal_V: number;
};

export type FlashOption = {
  id: string;
  label: string;
  megabit: 128 | 256;
  bytes: number;
};

export const DEFAULT_FIELDS: StatField[] = [
  "timestamp_u32",
  "odba_mean_i16",
  "odba_max_i16",
  "vedba_mean_i16",
  "vedba_max_i16",
  "std_xyz_i16x3",
  "mean_xyz_i16x3",
  "peak_acc_i16",
  "sample_count_u16",
  "activity_flags_u8",
  "reserved_u8"
];

export const BATTERY_PRESETS: BatteryPreset[] = [
  {
    id: "saft_ls14250_single",
    label: "1x Saft LS14250 (1.2Ah, 3.6V)",
    capacity_mAh: 1200,
    nominal_V: 3.6
  }
];

export const FLASH_OPTIONS: FlashOption[] = [
  {
    id: "128_mbit",
    label: "128 megabit (16 MiB)",
    megabit: 128,
    bytes: 16 * 1024 * 1024
  },
  {
    id: "256_mbit",
    label: "256 megabit (32 MiB)",
    megabit: 256,
    bytes: 32 * 1024 * 1024
  }
];

export const defaultConfig: AppConfig = {
  battery: {
    capacity_mAh: BATTERY_PRESETS[0].capacity_mAh,
    nominal_V: BATTERY_PRESETS[0].nominal_V,
    usable_fraction: 0.85
  },
  storage: {
    flash_bytes_available: FLASH_OPTIONS[0].bytes
  },
  lis: {
    odr_hz: 25,
    mode: "LP1",
    noise: "low_noise_off",
    fs_g: 2,
    fifo_watermark: 32,
    fifo_mode: "fifo"
  },
  nrf52: {
    sleep_current_uA: 1.5,
    active_current_mA: 4,
    fifo_service_time_ms: 2,
    finalize_time_ms: 10
  },
  flash: {
    enabled: false,
    write_current_mA: 4,
    write_time_ms: 5,
    erase_current_mA: 4,
    erase_time_ms: 50,
    erase_interval_records: 64
  },
  report: {
    interval_seconds: 300,
    store_to_flash: false
  },
  payload: {
    included_fields: DEFAULT_FIELDS,
    scaling: {
      accel_unit: "mg",
      odba_unit: "mg",
      vedba_unit: "mg",
      std_unit: "mg",
      peak_unit: "mg"
    },
    odba_definition: "abs_sum_dynamic",
    vedba_definition: "rss_dynamic",
    gravity_removal: "iir_lp",
    iir_alpha: 0.01,
    mean_std_frame: "dynamic",
    activity_thresholds: {
      odba_mean_mg: 200,
      stillness_std_mg: 60
    }
  },
  max_payload_bytes: 64,
  uncertainty: {
    enabled: false,
    best_case_factor: 0.85,
    typical_factor: 1,
    worst_case_factor: 1.2
  }
};

export const ODR_CHOICES = [1.6, 12.5, 25, 50, 100];
