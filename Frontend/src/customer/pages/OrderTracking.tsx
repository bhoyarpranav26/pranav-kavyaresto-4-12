import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaCheckCircle } from 'react-icons/fa'
 
const OrderTracking: React.FC = () => {
  const navigate = useNavigate()
  // no single payment label required for order list view
  const [orders, setOrders] = useState<any[]>([])
 
  useEffect(() => {
    // Load orders from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('orders') || '[]')
      setOrders(Array.isArray(saved) ? saved : [])
    } catch (e) {
      setOrders([])
    }
  // No total amount display anymore; we only list previous orders line-by-line
    sessionStorage.removeItem('paymentInProgress')
  }, [navigate])
 
  // Keep icons minimal for this list view. Details are in each order row.
 
  return (
    <div className="container py-5" style={{ minHeight: '100vh' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
 
          <div className="card shadow-sm border-0 rounded-4 p-4 text-center">
            <div className="d-flex justify-content-center align-items-center">
  <FaCheckCircle className="text-success mb-3" size={50} />
</div>

            <h3 className="fw-bold mb-1">Order Tracking</h3>
            <p className="text-muted mb-4">View your recent orders and their status.</p>
 
            {/* Payment Info */}
            {/* Orders list */}
            <div className="mb-3">
              {orders.length === 0 ? (
                <div className="text-center py-4">
                  <p className="mb-1">No orders yet.</p>
                  <small className="text-muted">Once you place orders they will appear here.</small>
                </div>
              ) : (
                <div>
                  <h6 className="mb-2">Previous Orders</h6>
                  <div className="list-group">
                    {orders.slice().reverse().map(o => (
                      <div key={o.id} className="list-group-item">
                        <div className="d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="fw-bold">{o.id}</div>
                            <div className="text-end">
                              <div className="text-muted small">{new Date(o.createdAt).toLocaleString()}</div>
                              <div className="fw-bold" style={{ color: '#FF6A00' }}>₹{(o.total || o.orderTotal || 0).toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="mt-1 small text-muted">Payment: {o.paymentLabel || o.paymentMethod || 'N/A'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link 
              to="/category" 
              className="btn mt-4 w-100 rounded-pill text-white fw-semibold py-2"
              style={{ 
                background: 'linear-gradient(90deg, #FFA500, #FF6B00)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 106, 0, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '3px solid #FF6A00'
                e.currentTarget.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
            >
              Back to Home
            </Link>
          </div>
 
        </div>
      </div>
    </div>
  )
}
 
export default OrderTracking