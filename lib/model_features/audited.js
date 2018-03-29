// created_at, updated_at

// (defn audit-create-callback [doc options]
//   (assoc doc :created_at (d/now)))
//
// (defn audit-update-callback [doc options]
//   (assoc doc :updated_at (d/now)))
//
// (def audited-schema {
//   :type "object"
//   :properties {
//     :created_at {:type "string" :format "date-time" :x-meta {:api_writable false :versioned false}}
//     :created_by {:type "string" :x-meta {:api_writable false :versioned false}}
//     :updated_at {:type "string" :format "date-time" :x-meta {:api_writable false :versioned false :change_tracking false}}
//     :updated_by {:type "string" :x-meta {:api_writable false :versioned false :change_tracking false}}
//   }
//   :required [:created_at :created_by]
// })
//
// (def audited-callbacks {
//   :create {
//     :before [audit-create-callback]
//   }
//   :update {
//     :before [audit-update-callback]
//   }
// })
//
// (defn audited-spec [& options] {
//     :schema audited-schema
//     :callbacks audited-callbacks
// })

const model = {
  schema: {

  }
}

module.exports = model
